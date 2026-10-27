import uuid
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.kisi_kisi import KisiKisi
from app.models.butir_soal import ButirSoal
from app.core.deps import get_current_guru
from app.core.galat import Galat
from app.services.agents.orchestrator import (
    jalankan_generasi,
    stop_generasi_kisi_kisi,
)

from app.services.paket import pastikan_kuota_soal

router = APIRouter(prefix="/api/kisi-kisi", tags=["generasi"])
alt_router = APIRouter(prefix="/api/generasi", tags=["generasi-alt"])


@router.post("/{kisi_kisi_id}/generate", status_code=202)
@alt_router.post("/{kisi_kisi_id}/generate", status_code=202)
async def trigger_generation(
    kisi_kisi_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(KisiKisi).where(KisiKisi.id == kisi_kisi_id))
    kk = result.scalar_one_or_none()
    if not kk:
        raise Galat(404, "generasi_kisi_kisi_tidak_ditemukan", "Kisi-kisi tidak ditemukan")
    if kk.guru_id != guru.id:
        raise Galat(403, "generasi_bukan_kisi_kisi_guru", "Bukan kisi-kisi Anda")

    existing_butir = await db.execute(
        select(ButirSoal).where(ButirSoal.kisi_kisi_id == kisi_kisi_id)
    )
    if existing_butir.scalars().first():
        raise Galat(409, "generasi_sudah_dijalankan", "Generasi untuk kisi-kisi ini sudah pernah dijalankan")

    await pastikan_kuota_soal(db, guru, kk.jumlah_butir)
    background_tasks.add_task(jalankan_generasi, kisi_kisi_id)
    return {
        "detail": "Proses deliberasi 4 agen AI dimulai di latar belakang",
        "kisi_kisi_id": str(kisi_kisi_id),
    }


@router.get("/{kisi_kisi_id}/status")
@alt_router.get("/{kisi_kisi_id}/status")
async def get_generation_status(
    kisi_kisi_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(KisiKisi).where(KisiKisi.id == kisi_kisi_id))
    kk = result.scalar_one_or_none()
    if not kk:
        raise Galat(404, "generasi_kisi_kisi_tidak_ditemukan", "Kisi-kisi tidak ditemukan")
    if kk.guru_id != guru.id:
        raise Galat(403, "generasi_bukan_kisi_kisi_guru", "Bukan kisi-kisi Anda")

    butir_result = await db.execute(
        select(ButirSoal)
        .where(ButirSoal.kisi_kisi_id == kisi_kisi_id, ButirSoal.status != "arsip")
        .order_by(ButirSoal.created_at)
    )
    butir_list = butir_result.scalars().all()

    items = []
    for b in butir_list:
        items.append({
            "id": str(b.id),
            "status": b.status,
            "level_bloom": b.level_bloom,
            "ronde_saat_ini": b.ronde_saat_ini,
            "pertanyaan": b.pertanyaan[:100] if b.pertanyaan else "",
        })

    total = len(items)
    selesai = sum(1 for i in items if i["status"] in ("diterima", "ditolak", "ditandai"))

    return {
        "kisi_kisi_id": str(kisi_kisi_id),
        "total": total,
        "selesai": selesai,
        "items": items,
    }


@router.post("/{kisi_kisi_id}/stop")
@alt_router.post("/{kisi_kisi_id}/stop")
async def stop_generasi(
    kisi_kisi_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(KisiKisi).where(KisiKisi.id == kisi_kisi_id))
    kk = result.scalar_one_or_none()
    if not kk:
        raise Galat(404, "generasi_kisi_kisi_tidak_ditemukan", "Kisi-kisi tidak ditemukan")
    if kk.guru_id != guru.id:
        raise Galat(403, "generasi_bukan_kisi_kisi_guru", "Bukan kisi-kisi Anda")

    await stop_generasi_kisi_kisi(kisi_kisi_id)
    return {
        "detail": "Proses deliberasi berhasil dihentikan. Butir yang telah selesai tetap disimpan.",
        "kisi_kisi_id": str(kisi_kisi_id),
    }
