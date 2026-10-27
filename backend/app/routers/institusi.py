import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_admin, get_current_guru
from app.core.galat import Galat
from app.database import get_db
from app.models.institusi import Institusi
from app.models.user import User
from app.services.paket import soal_bulan_ini, token_bulan_ini

router = APIRouter(prefix="/api/institusi", tags=["institusi"])


class InstitusiBaru(BaseModel):
    nama: str = Field(min_length=2, max_length=255)
    kursi: int = Field(ge=1, le=100000)
    email_admin: EmailStr


class UbahInstitusi(BaseModel):
    nama: str | None = Field(default=None, min_length=2, max_length=255)
    kursi: int | None = Field(default=None, ge=1, le=100000)
    aktif: bool | None = None


class AnggotaBaru(BaseModel):
    email: EmailStr


async def _jumlah_anggota(db: AsyncSession, institusi_id) -> int:
    hasil = await db.execute(select(func.count(User.id)).where(User.institusi_id == institusi_id))
    return int(hasil.scalar() or 0)


async def _ringkas(db: AsyncSession, i: Institusi) -> dict:
    return {
        "id": str(i.id),
        "nama": i.nama,
        "kursi": i.kursi,
        "aktif": i.aktif,
        "anggota": await _jumlah_anggota(db, i.id),
    }


async def _ambil(db: AsyncSession, institusi_id: uuid.UUID) -> Institusi:
    i = (await db.execute(select(Institusi).where(Institusi.id == institusi_id))).scalar_one_or_none()
    if i is None:
        raise Galat(404, "institusi_tidak_ditemukan", "Institusi tidak ditemukan")
    return i


def _boleh_kelola(user: User, institusi_id: uuid.UUID) -> bool:
    return user.peran == "admin" or (user.institusi_id == institusi_id and user.admin_institusi)


@router.post("", status_code=201)
async def buat_institusi(
    data: InstitusiBaru, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)
):
    pengelola = (await db.execute(select(User).where(func.lower(User.email) == data.email_admin.lower()))).scalar_one_or_none()
    if pengelola is None:
        raise Galat(404, "institusi_akun_belum_terdaftar", "Akun dengan email itu belum terdaftar. Minta guru mendaftar dulu.")
    if pengelola.institusi_id is not None:
        raise Galat(409, "institusi_akun_sudah_anggota_lain", "Akun itu sudah menjadi anggota institusi lain")
    i = Institusi(nama=data.nama.strip(), kursi=data.kursi)
    db.add(i)
    await db.flush()
    pengelola.institusi_id = i.id
    pengelola.admin_institusi = True
    await db.commit()
    return await _ringkas(db, i)


@router.get("")
async def daftar_institusi(admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    semua = (await db.execute(select(Institusi).order_by(Institusi.created_at))).scalars().all()
    return [await _ringkas(db, i) for i in semua]


@router.put("/{institusi_id}")
async def ubah_institusi(
    institusi_id: uuid.UUID,
    data: UbahInstitusi,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    i = await _ambil(db, institusi_id)
    if data.kursi is not None and data.kursi < await _jumlah_anggota(db, i.id):
        raise Galat(409, "institusi_kursi_kurang_dari_anggota", "Kursi tidak boleh kurang dari jumlah anggota saat ini")
    if data.nama is not None:
        i.nama = data.nama.strip()
    if data.kursi is not None:
        i.kursi = data.kursi
    if data.aktif is not None:
        i.aktif = data.aktif
    await db.commit()
    return await _ringkas(db, i)


@router.get("/saya")
async def institusi_saya(guru: User = Depends(get_current_guru), db: AsyncSession = Depends(get_db)):
    if guru.institusi_id is None:
        return None
    i = await _ambil(db, guru.institusi_id)
    anggota = (
        await db.execute(select(User).where(User.institusi_id == i.id).order_by(User.admin_institusi.desc(), User.nama))
    ).scalars().all()
    return {
        **await _ringkas(db, i),
        "bisa_kelola": _boleh_kelola(guru, i.id),
        "anggota_daftar": [
            {
                "id": str(u.id),
                "nama": u.nama,
                "email": u.email,
                "admin_institusi": u.admin_institusi,
                "soal_bulan_ini": await soal_bulan_ini(db, u.id),
                "token_bulan_ini": await token_bulan_ini(db, u.id),
            }
            for u in anggota
        ],
    }


@router.post("/{institusi_id}/anggota", status_code=201)
async def tambah_anggota(
    institusi_id: uuid.UUID,
    data: AnggotaBaru,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    if not _boleh_kelola(guru, institusi_id):
        raise Galat(403, "institusi_hanya_admin_tambah_anggota", "Hanya admin institusi yang dapat menambah anggota")
    i = await _ambil(db, institusi_id)
    if not i.aktif:
        raise Galat(409, "institusi_lisensi_tidak_aktif", "Lisensi institusi tidak aktif")
    if await _jumlah_anggota(db, i.id) >= i.kursi:
        raise Galat(409, "institusi_kursi_penuh", f"Kursi penuh ({i.kursi}). Tambah kursi lisensi untuk menambah anggota.", kursi=i.kursi)
    u = (await db.execute(select(User).where(func.lower(User.email) == data.email.lower()))).scalar_one_or_none()
    if u is None:
        raise Galat(404, "institusi_akun_belum_terdaftar", "Akun dengan email itu belum terdaftar. Minta guru mendaftar dulu.")
    if u.institusi_id is not None:
        if u.institusi_id == i.id:
            raise Galat(409, "institusi_akun_sudah_anggota_ini", "Akun itu sudah menjadi anggota institusi ini")
        raise Galat(409, "institusi_akun_sudah_anggota_lain", "Akun itu sudah menjadi anggota institusi lain")
    u.institusi_id = i.id
    await db.commit()
    return {"id": str(u.id), "email": u.email, "institusi_id": str(i.id)}


@router.delete("/{institusi_id}/anggota/{user_id}", status_code=204)
async def keluarkan_anggota(
    institusi_id: uuid.UUID,
    user_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    if not _boleh_kelola(guru, institusi_id):
        raise Galat(403, "institusi_hanya_admin_keluarkan_anggota", "Hanya admin institusi yang dapat mengeluarkan anggota")
    u = (
        await db.execute(select(User).where(User.id == user_id, User.institusi_id == institusi_id))
    ).scalar_one_or_none()
    if u is None:
        raise Galat(404, "institusi_anggota_tidak_ditemukan", "Anggota tidak ditemukan di institusi ini")
    if u.admin_institusi and guru.peran != "admin":
        raise Galat(403, "institusi_admin_hanya_oleh_admin_sistem", "Admin institusi hanya dapat dikeluarkan oleh admin sistem")
    u.institusi_id = None
    u.admin_institusi = False
    await db.commit()
