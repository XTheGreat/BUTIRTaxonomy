import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.deps import get_current_admin, get_current_guru
from app.core.galat import Galat
from app.database import get_db
from app.models.butir_soal import ButirSoal
from app.models.kisi_kisi import KisiKisi
from app.models.marketplace import ListingBank, ListingButir, TransaksiMarketplace
from app.models.user import User

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])


class ListingBaru(BaseModel):
    judul: str = Field(min_length=3, max_length=255)
    deskripsi: str = Field(default="", max_length=2000)
    harga_rp: int = Field(ge=0, le=100_000_000)
    butir_ids: list[uuid.UUID] = Field(min_length=1, max_length=500)


class UbahListing(BaseModel):
    judul: str | None = Field(default=None, min_length=3, max_length=255)
    deskripsi: str | None = Field(default=None, max_length=2000)
    harga_rp: int | None = Field(default=None, ge=0, le=100_000_000)
    aktif: bool | None = None


def _hitung_bagi(harga: int) -> tuple[int, int]:
    komisi = round(harga * get_settings().MARKETPLACE_KOMISI_PERSEN / 100)
    return komisi, harga - komisi


async def _isi_listing(db: AsyncSession, l: ListingBank, pengguna: User, rinci: bool = False) -> dict:
    butir = (
        await db.execute(select(ListingButir).where(ListingButir.listing_id == l.id).order_by(ListingButir.urutan))
    ).scalars().all()
    distribusi: dict[str, int] = {}
    for b in butir:
        distribusi[b.level_bloom] = distribusi.get(b.level_bloom, 0) + 1
    penjual = (await db.execute(select(User.nama).where(User.id == l.penjual_id))).scalar_one()
    sudah_beli = (
        await db.execute(
            select(TransaksiMarketplace.status).where(
                TransaksiMarketplace.listing_id == l.id,
                TransaksiMarketplace.pembeli_id == pengguna.id,
                TransaksiMarketplace.status != "dibatalkan",
            )
        )
    ).scalars().first()
    hasil = {
        "id": str(l.id),
        "judul": l.judul,
        "deskripsi": l.deskripsi,
        "harga_rp": l.harga_rp,
        "aktif": l.aktif,
        "penjual": penjual,
        "milik_saya": l.penjual_id == pengguna.id,
        "jumlah_butir": len(butir),
        "distribusi_bloom": dict(sorted(distribusi.items())),
        "status_pembelian": sudah_beli,
        "created_at": l.created_at,
    }
    if rinci:
        hasil["pratinjau"] = [{"urutan": b.urutan, "pertanyaan": b.pertanyaan, "level_bloom": b.level_bloom} for b in butir[:2]]
    return hasil


@router.post("/listing", status_code=201)
async def terbitkan(data: ListingBaru, guru: User = Depends(get_current_guru), db: AsyncSession = Depends(get_db)):
    ids = list(dict.fromkeys(data.butir_ids))
    if ids and (
        await db.execute(select(ButirSoal.id).where(ButirSoal.id.in_(ids), ButirSoal.status == "arsip").limit(1))
    ).first():
        raise Galat(422, "marketplace_soal_arsip_tak_dijual", "Soal dari Arsip tidak boleh dijual di Marketplace.")
    butir = (
        await db.execute(
            select(ButirSoal)
            .join(KisiKisi, KisiKisi.id == ButirSoal.kisi_kisi_id)
            .where(ButirSoal.id.in_(ids), KisiKisi.guru_id == guru.id, ButirSoal.status == "diterima")
        )
    ).scalars().all()
    if len(butir) != len(ids):
        raise Galat(
            422,
            "marketplace_butir_tak_boleh_dijual",
            "Hanya butir berstatus diterima milik Anda yang boleh dijual. Periksa kembali pilihan butir.",
        )
    urut = {i: n for n, i in enumerate(ids)}
    butir.sort(key=lambda b: urut[b.id])

    l = ListingBank(penjual_id=guru.id, judul=data.judul.strip(), deskripsi=data.deskripsi.strip(), harga_rp=data.harga_rp)
    db.add(l)
    await db.flush()
    for n, b in enumerate(butir, start=1):
        db.add(
            ListingButir(
                listing_id=l.id, urutan=n, pertanyaan=b.pertanyaan, pilihan=b.pilihan, kunci_jawaban=b.kunci_jawaban,
                pembahasan=b.pembahasan, level_bloom=b.level_bloom, bobot_poin=b.bobot_poin,
            )
        )
    await db.commit()
    return await _isi_listing(db, l, guru)


@router.get("/listing")
async def jelajahi(
    saya: bool = False, guru: User = Depends(get_current_guru), db: AsyncSession = Depends(get_db)
):
    q = select(ListingBank).order_by(ListingBank.created_at.desc())
    if saya:
        q = q.where(ListingBank.penjual_id == guru.id)
    else:
        q = q.where(ListingBank.aktif.is_(True), ListingBank.penjual_id != guru.id)
    return [await _isi_listing(db, l, guru) for l in (await db.execute(q)).scalars().all()]


@router.get("/listing/{listing_id}")
async def detail_listing(listing_id: uuid.UUID, guru: User = Depends(get_current_guru), db: AsyncSession = Depends(get_db)):
    l = (await db.execute(select(ListingBank).where(ListingBank.id == listing_id))).scalar_one_or_none()
    if l is None or (not l.aktif and l.penjual_id != guru.id):
        raise Galat(404, "marketplace_listing_tidak_ditemukan", "Listing tidak ditemukan")
    return await _isi_listing(db, l, guru, rinci=True)


@router.put("/listing/{listing_id}")
async def ubah_listing(
    listing_id: uuid.UUID, data: UbahListing, guru: User = Depends(get_current_guru), db: AsyncSession = Depends(get_db)
):
    l = (await db.execute(select(ListingBank).where(ListingBank.id == listing_id))).scalar_one_or_none()
    if l is None or l.penjual_id != guru.id:
        raise Galat(404, "marketplace_listing_tidak_ditemukan", "Listing tidak ditemukan")
    for kolom in ("judul", "deskripsi", "harga_rp", "aktif"):
        nilai = getattr(data, kolom)
        if nilai is not None:
            setattr(l, kolom, nilai.strip() if isinstance(nilai, str) else nilai)
    await db.commit()
    return await _isi_listing(db, l, guru)


async def _salin_ke_pembeli(db: AsyncSession, t: TransaksiMarketplace, l: ListingBank) -> None:
    butir = (
        await db.execute(select(ListingButir).where(ListingButir.listing_id == l.id).order_by(ListingButir.urutan))
    ).scalars().all()
    distribusi: dict[str, int] = {}
    for b in butir:
        distribusi[b.level_bloom] = distribusi.get(b.level_bloom, 0) + 1
    total = len(butir)
    persen = {k: round(100 * v / total) for k, v in distribusi.items()}
    kk = KisiKisi(
        guru_id=t.pembeli_id, jumlah_butir=total, distribusi_bloom=persen,
        nama=f"Dibeli: {l.judul}"[:255], cakupan_bab=f"Dibeli dari marketplace: {l.judul}",
    )
    db.add(kk)
    await db.flush()
    for b in butir:
        db.add(
            ButirSoal(
                kisi_kisi_id=kk.id, pertanyaan=b.pertanyaan, pilihan=b.pilihan, kunci_jawaban=b.kunci_jawaban,
                pembahasan=b.pembahasan, level_bloom=b.level_bloom, bobot_poin=b.bobot_poin, status="diterima",
            )
        )
    t.kisi_kisi_id = kk.id
    t.status = "selesai"
    t.selesai_pada = datetime.now(timezone.utc)


@router.post("/listing/{listing_id}/beli", status_code=201)
async def beli(listing_id: uuid.UUID, guru: User = Depends(get_current_guru), db: AsyncSession = Depends(get_db)):
    l = (await db.execute(select(ListingBank).where(ListingBank.id == listing_id))).scalar_one_or_none()
    if l is None or not l.aktif:
        raise Galat(404, "marketplace_listing_tidak_dijual", "Listing tidak ditemukan atau sudah tidak dijual")
    if l.penjual_id == guru.id:
        raise Galat(409, "marketplace_beli_milik_sendiri", "Anda tidak dapat membeli bank soal milik sendiri")
    sudah = (
        await db.execute(
            select(TransaksiMarketplace.id).where(
                TransaksiMarketplace.listing_id == l.id,
                TransaksiMarketplace.pembeli_id == guru.id,
                TransaksiMarketplace.status != "dibatalkan",
            )
        )
    ).first()
    if sudah:
        raise Galat(409, "marketplace_sudah_dibeli", "Anda sudah membeli atau sedang memproses pembelian bank soal ini")

    komisi, pendapatan = _hitung_bagi(l.harga_rp)
    t = TransaksiMarketplace(
        listing_id=l.id, pembeli_id=guru.id, harga_rp=l.harga_rp, komisi_rp=komisi,
        pendapatan_penjual_rp=pendapatan, status="menunggu_pembayaran",
    )
    db.add(t)
    await db.flush()
    if l.harga_rp == 0:
        await _salin_ke_pembeli(db, t, l)
    await db.commit()
    return _isi_transaksi(t, l.judul)


def _isi_transaksi(t: TransaksiMarketplace, judul: str, **tambahan) -> dict:
    return {
        "id": str(t.id),
        "listing_id": str(t.listing_id),
        "judul": judul,
        "harga_rp": t.harga_rp,
        "komisi_rp": t.komisi_rp,
        "pendapatan_penjual_rp": t.pendapatan_penjual_rp,
        "status": t.status,
        "created_at": t.created_at,
        "selesai_pada": t.selesai_pada,
        **tambahan,
    }


@router.get("/transaksi/saya")
async def transaksi_saya(guru: User = Depends(get_current_guru), db: AsyncSession = Depends(get_db)):
    baris = (
        await db.execute(
            select(TransaksiMarketplace, ListingBank)
            .join(ListingBank, ListingBank.id == TransaksiMarketplace.listing_id)
            .where((TransaksiMarketplace.pembeli_id == guru.id) | (ListingBank.penjual_id == guru.id))
            .order_by(TransaksiMarketplace.created_at.desc())
        )
    ).all()
    pembelian = [_isi_transaksi(t, l.judul) for t, l in baris if t.pembeli_id == guru.id]
    penjualan = [_isi_transaksi(t, l.judul) for t, l in baris if l.penjual_id == guru.id and t.status == "selesai"]
    return {
        "pembelian": pembelian,
        "penjualan": penjualan,
        "total_pendapatan_rp": sum(p["pendapatan_penjual_rp"] for p in penjualan),
        "komisi_persen": get_settings().MARKETPLACE_KOMISI_PERSEN,
    }


@router.get("/transaksi")
async def semua_transaksi(
    status: str | None = None, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)
):
    q = (
        select(TransaksiMarketplace, ListingBank, User.nama)
        .join(ListingBank, ListingBank.id == TransaksiMarketplace.listing_id)
        .join(User, User.id == TransaksiMarketplace.pembeli_id)
        .order_by(TransaksiMarketplace.created_at.desc())
    )
    if status:
        q = q.where(TransaksiMarketplace.status == status)
    return [_isi_transaksi(t, l.judul, pembeli=nama) for t, l, nama in (await db.execute(q)).all()]


async def _transaksi_menunggu(db: AsyncSession, transaksi_id: uuid.UUID):
    t = (await db.execute(select(TransaksiMarketplace).where(TransaksiMarketplace.id == transaksi_id))).scalar_one_or_none()
    if t is None:
        raise Galat(404, "marketplace_transaksi_tidak_ditemukan", "Transaksi tidak ditemukan")
    if t.status != "menunggu_pembayaran":
        raise Galat(409, "marketplace_transaksi_sudah_berstatus", f"Transaksi sudah berstatus {t.status}", status=t.status)
    l = (await db.execute(select(ListingBank).where(ListingBank.id == t.listing_id))).scalar_one()
    return t, l


@router.put("/transaksi/{transaksi_id}/konfirmasi")
async def konfirmasi_pembayaran(
    transaksi_id: uuid.UUID, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)
):
    t, l = await _transaksi_menunggu(db, transaksi_id)
    await _salin_ke_pembeli(db, t, l)
    await db.commit()
    return _isi_transaksi(t, l.judul)


@router.put("/transaksi/{transaksi_id}/batalkan")
async def batalkan_transaksi(
    transaksi_id: uuid.UUID, admin: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)
):
    t, l = await _transaksi_menunggu(db, transaksi_id)
    t.status = "dibatalkan"
    await db.commit()
    return _isi_transaksi(t, l.judul)
