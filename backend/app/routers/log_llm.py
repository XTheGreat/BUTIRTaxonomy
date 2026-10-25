from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.deps import get_current_guru
from app.database import get_db
from app.models.log_llm import LogLLM
from app.models.user import User
from app.services.agents.penyedia import (
    PERAN,
    PenyediaTidakTersedia,
    periksa_konfigurasi,
    pilih_penyedia,
)

router = APIRouter(prefix="/api/log-llm", tags=["log-llm"])


def _penugasan() -> list[dict]:
    hasil = []
    for peran in PERAN:
        try:
            p = pilih_penyedia(peran)
            hasil.append(
                {"peran": peran, "kelompok": p.kelompok, "provider": p.provider, "model": p.model, "fallback": p.fallback}
            )
        except PenyediaTidakTersedia as e:
            hasil.append({"peran": peran, "galat": str(e)})
    return hasil


async def _statistik_ronde(db: AsyncSession, guru_id, sejak: datetime) -> dict:
    batas = get_settings().BATAS_RONDE_DETIK
    baris = (
        await db.execute(
            select(LogLLM.butir_id, LogLLM.percobaan_butir, LogLLM.ronde, LogLLM.waktu, LogLLM.latensi_ms)
            .where(LogLLM.guru_id == guru_id, LogLLM.waktu >= sejak, LogLLM.ronde.is_not(None))
        )
    ).all()

    rentang: dict[tuple, list[datetime]] = {}
    for butir_id, percobaan, ronde, waktu, latensi in baris:
        awal = waktu - timedelta(milliseconds=latensi or 0)
        r = rentang.setdefault((butir_id, percobaan, ronde), [awal, waktu])
        r[0], r[1] = min(r[0], awal), max(r[1], waktu)

    durasi = sorted((akhir - awal).total_seconds() for awal, akhir in rentang.values())
    lambat = sum(1 for d in durasi if d > batas)
    return {
        "batas_detik": batas,
        "jumlah": len(durasi),
        "rata_rata_detik": round(sum(durasi) / len(durasi), 1) if durasi else None,
        "p95_detik": round(durasi[min(len(durasi) - 1, int(len(durasi) * 0.95))], 1) if durasi else None,
        "maks_detik": round(durasi[-1], 1) if durasi else None,
        "melewati_batas": lambat,
        "persen_melewati_batas": round(100 * lambat / len(durasi), 1) if durasi else None,
    }


@router.get("")
async def daftar_log(
    limit: int = Query(50, ge=1, le=500),
    status: str | None = Query(None),
    peran: str | None = Query(None),
    provider: str | None = Query(None),
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    query = select(LogLLM).where(LogLLM.guru_id == guru.id)
    if status:
        query = query.where(LogLLM.status == status)
    if peran:
        query = query.where(LogLLM.peran == peran)
    if provider:
        query = query.where(LogLLM.provider == provider)
    baris = (await db.execute(query.order_by(LogLLM.waktu.desc()).limit(limit))).scalars().all()
    return [
        {
            "waktu": b.waktu,
            "butir_id": b.butir_id,
            "percobaan_butir": b.percobaan_butir,
            "ronde": b.ronde,
            "peran": b.peran,
            "kelompok": b.kelompok,
            "provider": b.provider,
            "model": b.model,
            "fallback": b.fallback,
            "percobaan_panggilan": b.percobaan_panggilan,
            "status": b.status,
            "kode_http": b.kode_http,
            "latensi_ms": b.latensi_ms,
            "token_prompt": b.token_prompt,
            "token_jawaban": b.token_jawaban,
            "token_total": b.token_total,
            "galat": b.galat,
        }
        for b in baris
    ]


@router.get("/ringkasan")
async def ringkasan_log(
    hari: int = Query(30, ge=1, le=365),
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    sejak = datetime.now(timezone.utc) - timedelta(days=hari)
    sukses = func.sum(case((LogLLM.status == "sukses", 1), else_=0))
    baris = (
        await db.execute(
            select(
                LogLLM.provider,
                LogLLM.model,
                LogLLM.peran,
                func.count(LogLLM.id),
                sukses,
                func.sum(case((LogLLM.status == "rate_limit", 1), else_=0)),
                func.sum(func.coalesce(LogLLM.token_total, 0)),
                func.avg(case((LogLLM.status == "sukses", LogLLM.latensi_ms), else_=None)),
                func.max(LogLLM.latensi_ms),
                func.sum(case((LogLLM.fallback.is_(True), 1), else_=0)),
                func.max(LogLLM.waktu),
            )
            .where(LogLLM.guru_id == guru.id, LogLLM.waktu >= sejak)
            .group_by(LogLLM.provider, LogLLM.model, LogLLM.peran)
        )
    ).all()

    rincian = [
        {
            "provider": prov,
            "model": model,
            "peran": peran,
            "permintaan": total,
            "sukses": int(ok or 0),
            "gagal": total - int(ok or 0),
            "rate_limit": int(rl or 0),
            "token_total": int(token or 0),
            "latensi_rata_rata_ms": round(rata) if rata is not None else None,
            "latensi_maks_ms": maks,
            "lewat_fallback": int(fb or 0),
            "terakhir_dipakai": terakhir,
        }
        for prov, model, peran, total, ok, rl, token, rata, maks, fb, terakhir in baris
    ]
    terbaru: dict[tuple, datetime] = {}
    for r in rincian:
        k = (r["provider"], r["model"])
        if r["terakhir_dipakai"] and (k not in terbaru or r["terakhir_dipakai"] > terbaru[k]):
            terbaru[k] = r["terakhir_dipakai"]
    awal = datetime.min.replace(tzinfo=timezone.utc)
    rincian.sort(
        key=lambda r: (
            -(terbaru.get((r["provider"], r["model"]), awal) - awal).total_seconds(),
            r["provider"],
            r["model"],
            PERAN.index(r["peran"]) if r["peran"] in PERAN else len(PERAN),
        )
    )
    return {
        "hari": hari,
        "total_permintaan": sum(r["permintaan"] for r in rincian),
        "total_gagal": sum(r["gagal"] for r in rincian),
        "total_token": sum(r["token_total"] for r in rincian),
        "rincian": rincian,
        "ronde": await _statistik_ronde(db, guru.id, sejak),
        "admin": guru.peran == "admin",
        "penugasan": _penugasan() if guru.peran == "admin" else [],
        "peringatan": periksa_konfigurasi() if guru.peran == "admin" else [],
    }
