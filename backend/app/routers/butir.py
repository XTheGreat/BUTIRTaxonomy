from app.config import get_settings
import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func, case
from app.database import get_db
from app.models.user import User
from app.models.kisi_kisi import KisiKisi, kisi_kisi_materi
from app.models.materi import Materi
from app.models.butir_soal import ButirSoal
from app.models.debat_log import DebatLog
from app.models.riwayat_percobaan import RiwayatPercobaan
from app.schemas.butir import (
    ButirSoalResponse,
    ButirSoalUpdate,
    ButirTertundaResponse,
    DebatLogResponse,
    HistoryButirItem,
    HistoryDebatTerakhir,
    RiwayatPercobaanResponse,
)
from app.core.deps import get_current_guru
from app.services.agents.orchestrator import (
    ALASAN_DIHENTIKAN,
    antrekan_retry,
    jalankan_antrean_retry,
)

router = APIRouter(prefix="/api/butir", tags=["butir"])


async def _butir_milik_guru(db: AsyncSession, butir_id: uuid.UUID, guru: User) -> ButirSoal:
    butir = (
        await db.execute(select(ButirSoal).where(ButirSoal.id == butir_id))
    ).scalar_one_or_none()
    if not butir:
        raise HTTPException(status_code=404, detail="Butir tidak ditemukan")
    kk = (
        await db.execute(select(KisiKisi).where(KisiKisi.id == butir.kisi_kisi_id))
    ).scalar_one_or_none()
    if not kk or kk.guru_id != guru.id:
        raise HTTPException(status_code=403, detail="Bukan butir Anda")
    return butir


def _label_kisi_kisi(kk: KisiKisi, judul_materi: list[str]) -> str:
    judul = ", ".join(judul_materi)
    if kk.cakupan_bab:
        return f"{judul} ({kk.cakupan_bab})" if judul else kk.cakupan_bab
    return judul or "Kisi-kisi tanpa materi"


async def _judul_materi_per_kisi(
    db: AsyncSession, kisi_ids: set[uuid.UUID]
) -> dict[uuid.UUID, list[str]]:
    judul_per_kisi: dict[uuid.UUID, list[str]] = {}
    if kisi_ids:
        materi_rows = await db.execute(
            select(kisi_kisi_materi.c.kisi_kisi_id, Materi.judul)
            .join(Materi, Materi.id == kisi_kisi_materi.c.materi_id)
            .where(kisi_kisi_materi.c.kisi_kisi_id.in_(kisi_ids))
        )
        for kisi_id, judul in materi_rows.all():
            judul_per_kisi.setdefault(kisi_id, []).append(judul)
    return judul_per_kisi


async def _respons_tertunda(db: AsyncSession, baris) -> list[ButirTertundaResponse]:
    judul_per_kisi = await _judul_materi_per_kisi(db, {kk.id for _, kk in baris})
    punya_log: set[uuid.UUID] = set()
    if baris:
        punya_log = {
            butir_id
            for (butir_id,) in (
                await db.execute(
                    select(DebatLog.butir_id)
                    .join(ButirSoal, and_(ButirSoal.id == DebatLog.butir_id, ButirSoal.percobaan_ke == DebatLog.percobaan_ke))
                    .where(DebatLog.butir_id.in_([b.id for b, _ in baris]))
                    .distinct()
                )
            ).all()
        }

    return [
        ButirTertundaResponse(
            id=b.id,
            kisi_kisi_id=b.kisi_kisi_id,
            kisi_kisi_label=_label_kisi_kisi(kk, judul_per_kisi.get(kk.id, [])),
            level_bloom=b.level_bloom,
            status=b.status,
            ronde_saat_ini=b.ronde_saat_ini,
            percobaan_ke=b.percobaan_ke,
            alasan_tertunda=b.alasan_tertunda,
            bisa_dilanjutkan=b.status == "tertunda" and b.id in punya_log,
            pertanyaan=(b.pertanyaan or "")[:200],
            updated_at=b.updated_at,
        )
        for b, kk in baris
    ]


@router.get("/history-terakhir", response_model=HistoryDebatTerakhir | None)
async def get_history_debat_terakhir(
    lengkap: bool = Query(False, description="Sertakan semua butir beserta isinya"),
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    sedang_jalan = func.sum(
        case((ButirSoal.status.in_(["draft", "debating"]), 1), else_=0)
    )
    kisi_rows = await db.execute(
        select(KisiKisi.id, func.count(ButirSoal.id), sedang_jalan)
        .join(ButirSoal, ButirSoal.kisi_kisi_id == KisiKisi.id)
        .where(KisiKisi.guru_id == guru.id, ButirSoal.status != "arsip")
        .group_by(KisiKisi.id)
        .order_by(KisiKisi.created_at.desc())
    )
    kisi_id = next(
        (kid for kid, total, jalan in kisi_rows.all() if total > 0 and not jalan), None
    )
    if kisi_id is None:
        return None

    kk = (await db.execute(select(KisiKisi).where(KisiKisi.id == kisi_id))).scalar_one()
    butir_rows = (
        (
            await db.execute(
                select(ButirSoal)
                .where(ButirSoal.kisi_kisi_id == kisi_id, ButirSoal.status != "arsip")
                .order_by(ButirSoal.created_at)
            )
        )
        .scalars()
        .all()
    )
    judul = await _judul_materi_per_kisi(db, {kisi_id})
    tampil = butir_rows if lengkap else butir_rows[:2]

    hitung: dict[str, int] = {}
    for b in butir_rows:
        hitung[b.status] = hitung.get(b.status, 0) + 1

    return HistoryDebatTerakhir(
        kisi_kisi_id=kisi_id,
        label=_label_kisi_kisi(kk, judul.get(kisi_id, [])),
        mulai=min(b.created_at for b in butir_rows),
        selesai=max(b.updated_at for b in butir_rows),
        total=len(butir_rows),
        hitung=hitung,
        items=[
            HistoryButirItem(
                id=b.id,
                level_bloom=b.level_bloom,
                status=b.status,
                ronde_saat_ini=b.ronde_saat_ini,
                percobaan_ke=b.percobaan_ke,
                pertanyaan=b.pertanyaan,
                pilihan=b.pilihan if lengkap else None,
                kunci_jawaban=b.kunci_jawaban if lengkap else None,
                pembahasan=b.pembahasan if lengkap else None,
            )
            for b in tampil
        ],
    )


@router.get("/tertunda", response_model=list[ButirTertundaResponse])
async def list_butir_tertunda(
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ButirSoal, KisiKisi)
        .join(KisiKisi, KisiKisi.id == ButirSoal.kisi_kisi_id)
        .where(
            KisiKisi.guru_id == guru.id,
            or_(
                ButirSoal.status == "tertunda",
                and_(
                    ButirSoal.status.in_(["draft", "debating"]),
                    ButirSoal.percobaan_ke > 1,
                ),
            ),
        )
        .order_by(ButirSoal.updated_at.desc())
    )
    return await _respons_tertunda(db, result.all())


@router.get("/diterima", response_model=list[ButirTertundaResponse])
async def list_butir_diterima(
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    baris = (
        await db.execute(
            select(ButirSoal, KisiKisi)
            .join(KisiKisi, KisiKisi.id == ButirSoal.kisi_kisi_id)
            .where(KisiKisi.guru_id == guru.id, ButirSoal.status == "diterima")
            .order_by(ButirSoal.updated_at.desc())
        )
    ).all()
    return await _respons_tertunda(db, baris)


@router.get("/diulang", response_model=list[ButirTertundaResponse])
async def list_butir_diulang(
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ButirSoal, KisiKisi)
        .join(KisiKisi, KisiKisi.id == ButirSoal.kisi_kisi_id)
        .where(KisiKisi.guru_id == guru.id, ButirSoal.percobaan_ke > 1)
        .order_by(ButirSoal.updated_at.desc())
    )
    return await _respons_tertunda(db, result.all())


@router.post("/retry-semua", status_code=202)
async def retry_semua_tertunda(
    background_tasks: BackgroundTasks,
    mulai_ulang: bool = Query(False, description="True: debat diulang dari ronde 1; False: dilanjutkan dari langkah terakhir yang selesai"),
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ButirSoal)
        .join(KisiKisi, KisiKisi.id == ButirSoal.kisi_kisi_id)
        .where(KisiKisi.guru_id == guru.id, ButirSoal.status == "tertunda")
        .order_by(ButirSoal.created_at)
    )
    butir_list = result.scalars().all()
    if not butir_list:
        raise HTTPException(status_code=400, detail="Tidak ada butir tertunda untuk diulang")

    ids = await antrekan_retry(db, butir_list, mulai_ulang)
    background_tasks.add_task(jalankan_antrean_retry, ids)
    return {"detail": f"{len(ids)} butir tertunda dimasukkan ke antrean", "jumlah": len(ids)}


@router.post("/{butir_id}/retry", status_code=202)
async def retry_butir(
    butir_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    mulai_ulang: bool = Query(False, description="True: debat diulang dari ronde 1; False: dilanjutkan dari langkah terakhir yang selesai"),
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    butir = await _butir_milik_guru(db, butir_id, guru)
    if butir.status != "tertunda":
        raise HTTPException(status_code=409, detail="Hanya butir berstatus tertunda yang bisa diulang")

    ids = await antrekan_retry(db, [butir], mulai_ulang)
    background_tasks.add_task(jalankan_antrean_retry, ids)
    return {"detail": "Butir dimasukkan ke antrean", "id": str(butir_id)}


@router.post("/{butir_id}/stop")
async def stop_butir(
    butir_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    butir = await _butir_milik_guru(db, butir_id, guru)
    if butir.status not in ("draft", "debating"):
        raise HTTPException(status_code=409, detail="Butir ini tidak sedang diproses")

    butir.status = "tertunda"
    butir.alasan_tertunda = ALASAN_DIHENTIKAN
    await db.commit()
    return {"detail": "Butir dihentikan", "id": str(butir_id)}


@router.get("/{butir_id}/riwayat", response_model=list[RiwayatPercobaanResponse])
async def get_riwayat_percobaan(
    butir_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    await _butir_milik_guru(db, butir_id, guru)
    result = await db.execute(
        select(RiwayatPercobaan)
        .where(RiwayatPercobaan.butir_id == butir_id)
        .order_by(RiwayatPercobaan.percobaan_ke.desc())
    )
    return [RiwayatPercobaanResponse.model_validate(r) for r in result.scalars().all()]


@router.get("", response_model=list[ButirSoalResponse])
async def list_butir(
    status: str | None = Query(None),
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(ButirSoal)
        .join(KisiKisi, KisiKisi.id == ButirSoal.kisi_kisi_id)
        .where(KisiKisi.guru_id == guru.id)
    )
    if status:
        query = query.where(ButirSoal.status == status)
    else:
        query = query.where(ButirSoal.status != "arsip")
    query = query.order_by(ButirSoal.created_at.desc())
    result = await db.execute(query)
    return [ButirSoalResponse.model_validate(b) for b in result.scalars().all()]


@router.get("/{butir_id}/debat-log", response_model=list[DebatLogResponse])
async def get_debat_log(
    butir_id: uuid.UUID,
    percobaan_ke: int | None = Query(None, description="Default: percobaan terbaru"),
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    butir = await _butir_milik_guru(db, butir_id, guru)

    result = await db.execute(
        select(DebatLog)
        .where(
            DebatLog.butir_id == butir_id,
            DebatLog.percobaan_ke == (percobaan_ke or butir.percobaan_ke),
        )
        .order_by(DebatLog.ronde, DebatLog.created_at)
    )
    return [DebatLogResponse.model_validate(log) for log in result.scalars().all()]


def _agen_berpikir(status: str, logs: list[DebatLog], max_ronde: int) -> dict | None:
    if status != "debating":
        return None
    if not logs:
        return {"ronde": 1, "agen": ["penyusun"]}
    ronde = max(l.ronde for l in logs)
    ada = {l.agen: l for l in logs if l.ronde == ronde}
    if "arbiter" in ada:
        verdict = (ada["arbiter"].output_json or {}).get("verdict")
        if verdict == "revisi" and ronde < max_ronde:
            return {"ronde": ronde + 1, "agen": ["penyusun"]}
        return None
    if "kritikus" in ada or "penjawab_buta" in ada:
        belum = [a for a in ("kritikus", "penjawab_buta") if a not in ada]
        return {"ronde": ronde, "agen": belum or ["arbiter"]}
    if "penyusun" in ada:
        return {"ronde": ronde, "agen": ["kritikus", "penjawab_buta"]}
    return {"ronde": ronde, "agen": ["penyusun"]}


@router.get("/{butir_id}/debat-live")
async def get_debat_live(
    butir_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    butir = await _butir_milik_guru(db, butir_id, guru)
    logs = (
        await db.execute(
            select(DebatLog)
            .where(DebatLog.butir_id == butir_id, DebatLog.percobaan_ke == butir.percobaan_ke)
            .order_by(DebatLog.ronde, DebatLog.created_at)
        )
    ).scalars().all()
    return {
        "butir_id": str(butir.id),
        "kisi_kisi_id": str(butir.kisi_kisi_id),
        "status": butir.status,
        "level_bloom": butir.level_bloom,
        "level_target": butir.level_target,
        "percobaan_ke": butir.percobaan_ke,
        "ronde_saat_ini": butir.ronde_saat_ini,
        "max_ronde": get_settings().MAX_RONDE_DEBAT,
        "alasan_tertunda": butir.alasan_tertunda if butir.status == "tertunda" else None,
        "menunggu_giliran": butir.status == "draft",
        "sedang_berpikir": _agen_berpikir(butir.status, list(logs), get_settings().MAX_RONDE_DEBAT),
        "pesan": [
            {"id": str(l.id), "ronde": l.ronde, "agen": l.agen, "output_json": l.output_json, "created_at": l.created_at}
            for l in logs
        ],
    }


@router.patch("/{butir_id}", response_model=ButirSoalResponse)
async def update_butir(
    butir_id: uuid.UUID,
    data: ButirSoalUpdate,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    butir = await _butir_milik_guru(db, butir_id, guru)
    if butir.status in ("draft", "debating"):
        raise HTTPException(
            status_code=409, detail="Butir masih diproses debat dan belum bisa diubah"
        )

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(butir, key, value)

    kunci_tidak_valid = butir.kunci_jawaban not in (butir.pilihan or {})
    if (butir.pilihan and kunci_tidak_valid) or (
        butir.status == "diterima" and (not butir.pertanyaan or kunci_tidak_valid)
    ):
        await db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Butir belum lengkap: pertanyaan, pilihan, dan kunci jawaban harus valid",
        )

    await db.commit()
    await db.refresh(butir)
    return ButirSoalResponse.model_validate(butir)
