import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_current_guru
from app.database import get_db
from app.models.butir_soal import ButirSoal
from app.models.debat_log import DebatLog
from app.models.kisi_kisi import KisiKisi
from app.models.paket_ujian import PaketUjianButir
from app.models.user import User
from app.schemas.butir import ArsipSimpan, ArsipSoalResponse

router = APIRouter(prefix="/api/arsip", tags=["arsip"])


def _label(kk: KisiKisi) -> str:
    return kk.nama or f"Kisi-kisi {str(kk.id)[:8]}"


def _respons(b: ButirSoal, label: str) -> ArsipSoalResponse:
    m = b.arsip_meta or {}
    return ArsipSoalResponse(
        id=b.id, kisi_kisi_id=b.kisi_kisi_id, kisi_kisi_label=label, pertanyaan=b.pertanyaan, pilihan=b.pilihan,
        kunci_jawaban=b.kunci_jawaban, pembahasan=b.pembahasan, bobot_poin=b.bobot_poin,
        sumber_butir_id=m.get("sumber_butir_id"), ronde=m.get("ronde"), asal_status=m.get("asal_status"),
        jawaban_penjawab_buta=m.get("jawaban_penjawab_buta"), keyakinan_penjawab_buta=m.get("keyakinan_penjawab_buta"),
        created_at=b.created_at,
    )


@router.get("", response_model=list[ArsipSoalResponse])
async def daftar_arsip(guru: User = Depends(get_current_guru), db: AsyncSession = Depends(get_db)):
    baris = (
        await db.execute(
            select(ButirSoal, KisiKisi)
            .join(KisiKisi, KisiKisi.id == ButirSoal.kisi_kisi_id)
            .where(KisiKisi.guru_id == guru.id, ButirSoal.status == "arsip")
            .order_by(ButirSoal.created_at.desc())
        )
    ).all()
    return [_respons(b, _label(kk)) for b, kk in baris]


@router.post("", response_model=ArsipSoalResponse, status_code=201)
async def simpan_ke_arsip(data: ArsipSimpan, guru: User = Depends(get_current_guru), db: AsyncSession = Depends(get_db)):
    baris = (
        await db.execute(
            select(ButirSoal, KisiKisi)
            .join(KisiKisi, KisiKisi.id == ButirSoal.kisi_kisi_id)
            .where(ButirSoal.id == data.butir_id, KisiKisi.guru_id == guru.id)
        )
    ).first()
    if not baris or baris[0].status == "arsip":
        raise HTTPException(status_code=404, detail="Butir tidak ditemukan")
    butir, kisi = baris
    if butir.status != "diterima":
        raise HTTPException(
            status_code=409,
            detail="Soal hanya bisa diarsipkan dari butir yang sudah diterima, lewat Riwayat Diterima.",
        )
    if data.ronde >= butir.ronde_saat_ini:
        raise HTTPException(
            status_code=409,
            detail="Ronde yang menghasilkan butir diterima tidak bisa diarsipkan karena sudah ada di Bank Soal.",
        )

    logs = (
        await db.execute(
            select(DebatLog)
            .where(
                DebatLog.butir_id == butir.id,
                DebatLog.percobaan_ke == butir.percobaan_ke,
                DebatLog.ronde == data.ronde,
            )
            .order_by(DebatLog.created_at)
        )
    ).scalars().all()
    terakhir: dict[str, dict] = {l.agen: l.output_json for l in logs}
    draf = terakhir.get("penyusun")
    if not draf or not draf.get("pertanyaan"):
        raise HTTPException(status_code=404, detail="Soal pada ronde ini tidak ditemukan")
    if (terakhir.get("arbiter") or {}).get("verdict") == "diterima":
        raise HTTPException(status_code=409, detail="Ronde ini diterima Arbiter, jadi tidak bisa diarsipkan.")

    sudah = (
        await db.execute(
            select(ButirSoal).where(ButirSoal.kisi_kisi_id == butir.kisi_kisi_id, ButirSoal.status == "arsip")
        )
    ).scalars().all()
    for a in sudah:
        m = a.arsip_meta or {}
        if m.get("sumber_butir_id") == str(butir.id) and m.get("ronde") == data.ronde:
            raise HTTPException(status_code=409, detail="Soal pada ronde ini sudah ada di Arsip.")

    buta = terakhir.get("penjawab_buta") or {}
    arsip = ButirSoal(
        kisi_kisi_id=butir.kisi_kisi_id,
        pertanyaan=draf.get("pertanyaan", ""),
        pilihan=draf.get("pilihan") or {},
        kunci_jawaban=draf.get("kunci_jawaban", ""),
        pembahasan=draf.get("pembahasan", ""),
        level_bloom="",
        bobot_poin=1,
        status="arsip",
        arsip_meta={
            "sumber_butir_id": str(butir.id),
            "ronde": data.ronde,
            "asal_status": butir.status,
            "jawaban_penjawab_buta": buta.get("jawaban_pilihan"),
            "keyakinan_penjawab_buta": buta.get("tingkat_keyakinan"),
        },
    )
    db.add(arsip)
    await db.commit()
    await db.refresh(arsip)
    return _respons(arsip, _label(kisi))


@router.delete("/{arsip_id}", status_code=204)
async def hapus_arsip(arsip_id: uuid.UUID, guru: User = Depends(get_current_guru), db: AsyncSession = Depends(get_db)):
    arsip = (
        await db.execute(
            select(ButirSoal)
            .join(KisiKisi, KisiKisi.id == ButirSoal.kisi_kisi_id)
            .where(ButirSoal.id == arsip_id, KisiKisi.guru_id == guru.id, ButirSoal.status == "arsip")
        )
    ).scalar_one_or_none()
    if not arsip:
        raise HTTPException(status_code=404, detail="Soal arsip tidak ditemukan")
    dipakai = (
        await db.execute(select(PaketUjianButir.paket_ujian_id).where(PaketUjianButir.butir_id == arsip.id).limit(1))
    ).first()
    if dipakai:
        raise HTTPException(status_code=409, detail="Soal ini sudah dipakai dalam paket ujian dan tidak bisa dihapus.")
    await db.delete(arsip)
    await db.commit()
