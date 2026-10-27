import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import case, delete, func, select
from app.database import get_db
from app.models.user import User
from app.models.butir_soal import ButirSoal
from app.models.kisi_kisi import KisiKisi, kisi_kisi_materi
from app.models.materi import Materi, MateriChunk
from app.schemas.kisi_kisi import (
    CekCakupanRequest,
    KisiKisiCreate,
    KisiKisiResponse,
    KisiKisiRingkas,
    MateriRingkas,
)
from app.core.deps import get_current_guru
from app.core.galat import Galat
from app.services.cakupan import kata_kunci, pilih_potongan

router = APIRouter(prefix="/api/kisi-kisi", tags=["kisi-kisi"])


async def _kisi_milik_guru(db: AsyncSession, kisi_kisi_id: uuid.UUID, guru: User) -> KisiKisi:
    kk = (await db.execute(select(KisiKisi).where(KisiKisi.id == kisi_kisi_id))).scalar_one_or_none()
    if not kk:
        raise Galat(404, "kisi_kisi_tidak_ditemukan", "Kisi-kisi tidak ditemukan")
    if kk.guru_id != guru.id:
        raise Galat(403, "kisi_kisi_bukan_milik_guru", "Bukan kisi-kisi Anda")
    return kk


async def _pastikan_belum_dijalankan(db: AsyncSession, kisi_kisi_id: uuid.UUID, tindakan: str) -> None:
    ada = (
        await db.execute(select(ButirSoal.id).where(ButirSoal.kisi_kisi_id == kisi_kisi_id).limit(1))
    ).first()
    if ada:
        raise Galat(
            409,
            "kisi_kisi_sudah_dijalankan",
            f"Kisi-kisi ini sudah dijalankan dan tidak bisa {tindakan}. Buat kisi-kisi baru.",
            tindakan=tindakan,
        )


async def _periksa_materi_milik_guru(db: AsyncSession, materi_ids: list[uuid.UUID], guru: User) -> None:
    for materi_id in materi_ids:
        materi = (await db.execute(select(Materi).where(Materi.id == materi_id))).scalar_one_or_none()
        if not materi or materi.guru_id != guru.id:
            raise Galat(
                404,
                "kisi_kisi_materi_tidak_ditemukan",
                f"Materi {materi_id} tidak ditemukan",
                materi_id=str(materi_id),
            )


async def _hubungkan_materi(db: AsyncSession, kisi_kisi_id: uuid.UUID, materi_ids: list[uuid.UUID]) -> None:
    for materi_id in materi_ids:
        await db.execute(kisi_kisi_materi.insert().values(kisi_kisi_id=kisi_kisi_id, materi_id=materi_id))


@router.post("", response_model=KisiKisiResponse, status_code=201)
async def create_kisi_kisi(
    data: KisiKisiCreate,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    await _periksa_materi_milik_guru(db, data.materi_ids, guru)
    kk = KisiKisi(
        guru_id=guru.id,
        jumlah_butir=data.jumlah_butir,
        distribusi_bloom=data.distribusi_bloom,
        cakupan_bab=data.cakupan_bab,
        nama=data.nama,
    )
    db.add(kk)
    await db.flush()
    await _hubungkan_materi(db, kk.id, data.materi_ids)
    await db.commit()
    await db.refresh(kk)
    return KisiKisiResponse.model_validate(kk)


@router.get("", response_model=list[KisiKisiRingkas])
async def daftar_kisi_kisi(
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    daftar = (
        await db.execute(
            select(KisiKisi).where(KisiKisi.guru_id == guru.id).order_by(KisiKisi.created_at.desc())
        )
    ).scalars().all()

    hitung = {
        kid: (total, int(berjalan or 0))
        for kid, total, berjalan in (
            await db.execute(
                select(
                    ButirSoal.kisi_kisi_id,
                    func.count(ButirSoal.id),
                    func.sum(case((ButirSoal.status.in_(["draft", "debating"]), 1), else_=0)),
                )
                .where(ButirSoal.kisi_kisi_id.in_([k.id for k in daftar]), ButirSoal.status != "arsip")
                .group_by(ButirSoal.kisi_kisi_id)
            )
        ).all()
    } if daftar else {}

    materi_per_kisi: dict[uuid.UUID, list[MateriRingkas]] = {}
    if daftar:
        for kid, mid, judul in (
            await db.execute(
                select(kisi_kisi_materi.c.kisi_kisi_id, Materi.id, Materi.judul)
                .join(Materi, Materi.id == kisi_kisi_materi.c.materi_id)
                .where(kisi_kisi_materi.c.kisi_kisi_id.in_([k.id for k in daftar]))
                .order_by(Materi.judul)
            )
        ).all():
            materi_per_kisi.setdefault(kid, []).append(MateriRingkas(id=mid, judul=judul))

    hasil = []
    for kk in daftar:
        total, berjalan = hitung.get(kk.id, (0, 0))
        hasil.append(
            KisiKisiRingkas(
                **KisiKisiResponse.model_validate(kk).model_dump(),
                materi=materi_per_kisi.get(kk.id, []),
                butir_dibuat=total,
                butir_berjalan=berjalan,
            )
        )
    return hasil


@router.post("/cek-cakupan")
async def cek_cakupan(
    data: CekCakupanRequest,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    await _periksa_materi_milik_guru(db, list(dict.fromkeys(data.materi_ids)), guru)
    potongan = (
        await db.execute(
            select(MateriChunk)
            .where(MateriChunk.materi_id.in_(data.materi_ids))
            .order_by(MateriChunk.chunk_index)
        )
    ).scalars().all()
    terpilih, cocok = pilih_potongan(list(potongan), data.cakupan_bab)
    return {
        "ada_cakupan": bool(kata_kunci(data.cakupan_bab)),
        "kata_kunci": kata_kunci(data.cakupan_bab),
        "jumlah_potongan": len(potongan),
        "potongan_cocok": len(terpilih) if cocok else 0,
    }


@router.get("/{kisi_kisi_id}", response_model=KisiKisiResponse)
async def get_kisi_kisi(
    kisi_kisi_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    return KisiKisiResponse.model_validate(await _kisi_milik_guru(db, kisi_kisi_id, guru))


@router.put("/{kisi_kisi_id}", response_model=KisiKisiResponse)
async def ubah_kisi_kisi(
    kisi_kisi_id: uuid.UUID,
    data: KisiKisiCreate,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    kk = await _kisi_milik_guru(db, kisi_kisi_id, guru)
    await _pastikan_belum_dijalankan(db, kk.id, "diubah")
    await _periksa_materi_milik_guru(db, data.materi_ids, guru)

    kk.jumlah_butir = data.jumlah_butir
    kk.distribusi_bloom = data.distribusi_bloom
    kk.cakupan_bab = data.cakupan_bab
    kk.nama = data.nama
    await db.execute(delete(kisi_kisi_materi).where(kisi_kisi_materi.c.kisi_kisi_id == kk.id))
    await _hubungkan_materi(db, kk.id, data.materi_ids)
    await db.commit()
    await db.refresh(kk)
    return KisiKisiResponse.model_validate(kk)


@router.delete("/{kisi_kisi_id}", status_code=204)
async def hapus_kisi_kisi(
    kisi_kisi_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    kk = await _kisi_milik_guru(db, kisi_kisi_id, guru)
    await _pastikan_belum_dijalankan(db, kk.id, "dihapus")
    await db.execute(delete(kisi_kisi_materi).where(kisi_kisi_materi.c.kisi_kisi_id == kk.id))
    await db.execute(delete(KisiKisi).where(KisiKisi.id == kk.id))
    await db.commit()
