import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_admin, get_current_guru
from app.database import get_db
from app.models.user import User
from app.services.paket import (
    PAKET_VALID,
    batas_paket,
    ringkasan_pemakaian,
    soal_bulan_ini,
    token_bulan_ini,
)

router = APIRouter(prefix="/api/paket", tags=["paket"])


class UbahPaket(BaseModel):
    paket: str


@router.get("/saya")
async def paket_saya(guru: User = Depends(get_current_guru), db: AsyncSession = Depends(get_db)):
    return await ringkasan_pemakaian(db, guru)


@router.get("/daftar")
async def daftar_paket(guru: User = Depends(get_current_guru)):
    return {nama: batas_paket(nama) for nama in PAKET_VALID}


@router.get("/pengguna")
async def daftar_pengguna(admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    pengguna = (await db.execute(select(User).order_by(User.created_at))).scalars().all()
    return [
        {
            "id": str(u.id),
            "nama": u.nama,
            "email": u.email,
            "peran": u.peran,
            "paket": u.paket,
            "soal_bulan_ini": await soal_bulan_ini(db, u.id),
            "token_bulan_ini": await token_bulan_ini(db, u.id),
        }
        for u in pengguna
    ]


@router.put("/pengguna/{user_id}")
async def ubah_paket(
    user_id: uuid.UUID,
    data: UbahPaket,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if data.paket not in PAKET_VALID:
        raise HTTPException(status_code=422, detail=f"Paket harus salah satu dari: {', '.join(PAKET_VALID)}")
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan")
    user.paket = data.paket
    await db.commit()
    return {"id": str(user.id), "paket": user.paket}
