from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.butir_soal import ButirSoal
from app.models.debat_log import DebatLog
from app.models.institusi import Institusi
from app.models.kisi_kisi import KisiKisi
from app.models.log_llm import LogLLM
from app.models.materi import Materi
from app.models.user import User

PAKET_VALID = ("gratis", "pro")
NAMA_PAKET = {"gratis": "Gratis", "pro": "Pro"}


def awal_bulan(sekarang: datetime | None = None) -> datetime:
    s = sekarang or datetime.now(timezone.utc)
    return s.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def batas_paket(paket: str) -> dict:
    s = get_settings()
    if paket == "pro":
        soal, materi, ekspor = s.PAKET_PRO_SOAL_BULAN, s.PAKET_PRO_MATERI, s.PAKET_PRO_EKSPOR
    else:
        soal, materi, ekspor = s.PAKET_GRATIS_SOAL_BULAN, s.PAKET_GRATIS_MATERI, s.PAKET_GRATIS_EKSPOR
    return {"soal": soal or None, "materi": materi or None, "ekspor": bool(ekspor)}


def _tanpa_batas(user: User) -> bool:
    return (not get_settings().KUOTA_AKTIF) or user.peran == "admin"


async def institusi_aktif(db: AsyncSession, user: User) -> Institusi | None:
    if user.institusi_id is None:
        return None
    i = (await db.execute(select(Institusi).where(Institusi.id == user.institusi_id))).scalar_one_or_none()
    return i if i is not None and i.aktif else None


async def konteks_kuota(db: AsyncSession, user: User) -> dict:
    inst = await institusi_aktif(db, user)
    if inst is None:
        return {"institusi": None, "paket": user.paket, "batas": batas_paket(user.paket)}
    batas = batas_paket("pro")
    if batas["soal"] is not None:
        batas = {**batas, "soal": batas["soal"] * inst.kursi}
    return {"institusi": inst, "paket": "pro", "batas": batas}


def _soal_tersampaikan():
    return (
        select(DebatLog.butir_id.label("butir_id"), func.min(DebatLog.created_at).label("pertama"))
        .group_by(DebatLog.butir_id)
        .subquery()
    )


async def soal_terpakai(db: AsyncSession, user: User, institusi: Institusi | None) -> int:
    if institusi is None:
        return await soal_bulan_ini(db, user.id)
    d = _soal_tersampaikan()
    hasil = await db.execute(
        select(func.count(ButirSoal.id))
        .join(d, d.c.butir_id == ButirSoal.id)
        .join(KisiKisi, KisiKisi.id == ButirSoal.kisi_kisi_id)
        .join(User, User.id == KisiKisi.guru_id)
        .where(User.institusi_id == institusi.id, d.c.pertama >= awal_bulan())
    )
    return int(hasil.scalar() or 0)


async def soal_bulan_ini(db: AsyncSession, guru_id) -> int:
    d = _soal_tersampaikan()
    hasil = await db.execute(
        select(func.count(ButirSoal.id))
        .join(d, d.c.butir_id == ButirSoal.id)
        .join(KisiKisi, KisiKisi.id == ButirSoal.kisi_kisi_id)
        .where(KisiKisi.guru_id == guru_id, d.c.pertama >= awal_bulan())
    )
    return int(hasil.scalar() or 0)


async def jumlah_materi(db: AsyncSession, guru_id) -> int:
    hasil = await db.execute(select(func.count(Materi.id)).where(Materi.guru_id == guru_id))
    return int(hasil.scalar() or 0)


async def token_bulan_ini(db: AsyncSession, guru_id) -> int:
    hasil = await db.execute(
        select(func.coalesce(func.sum(LogLLM.token_total), 0)).where(
            LogLLM.guru_id == guru_id, LogLLM.waktu >= awal_bulan()
        )
    )
    return int(hasil.scalar() or 0)


def _ditolak(pesan: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=pesan)


async def pastikan_kuota_soal(db: AsyncSession, user: User, jumlah: int) -> None:
    if _tanpa_batas(user):
        return
    k = await konteks_kuota(db, user)
    batas = k["batas"]["soal"]
    if batas is None:
        return
    terpakai = await soal_terpakai(db, user, k["institusi"])
    if terpakai + jumlah > batas:
        sisa = max(0, batas - terpakai)
        sumber = f"institusi {k['institusi'].nama}" if k["institusi"] else f"paket {NAMA_PAKET.get(k['paket'], k['paket'])}"
        saran = "Kurangi jumlah butir atau hubungi admin institusi." if k["institusi"] else "Kurangi jumlah butir atau upgrade ke paket Pro."
        raise _ditolak(
            f"Kuota soal {sumber} bulan ini tinggal {sisa} dari {batas}, sedangkan kisi-kisi ini meminta {jumlah}. {saran}"
        )


async def pastikan_kuota_materi(db: AsyncSession, user: User) -> None:
    if _tanpa_batas(user):
        return
    k = await konteks_kuota(db, user)
    batas = k["batas"]["materi"]
    if batas is not None and await jumlah_materi(db, user.id) >= batas:
        raise _ditolak(
            f"Paket {NAMA_PAKET.get(k['paket'], k['paket'])} dibatasi {batas} materi ajar. "
            "Hapus materi yang tidak dipakai atau upgrade ke paket Pro."
        )


async def pastikan_ekspor(db: AsyncSession, user: User) -> None:
    if _tanpa_batas(user):
        return
    if not (await konteks_kuota(db, user))["batas"]["ekspor"]:
        raise _ditolak("Ekspor PDF dan DOCX tersedia di paket Pro. Upgrade untuk memakai fitur ini.")


async def ringkasan_pemakaian(db: AsyncSession, user: User) -> dict:
    s = get_settings()
    k = await konteks_kuota(db, user)
    batas, inst = k["batas"], k["institusi"]
    terpakai_soal = await soal_terpakai(db, user, inst)
    token = await token_bulan_ini(db, user.id)
    tanpa_batas = _tanpa_batas(user)
    return {
        "bulan": awal_bulan().strftime("%Y-%m"),
        "paket": k["paket"],
        "nama_paket": NAMA_PAKET.get(k["paket"], k["paket"]),
        "kuota_aktif": s.KUOTA_AKTIF,
        "tanpa_batas": tanpa_batas,
        "admin": user.peran == "admin",
        "institusi": {"id": str(inst.id), "nama": inst.nama, "kursi": inst.kursi} if inst else None,
        "soal": {
            "terpakai": terpakai_soal,
            "batas": None if tanpa_batas else batas["soal"],
            "sisa": None if tanpa_batas or batas["soal"] is None else max(0, batas["soal"] - terpakai_soal),
        },
        "materi": {
            "terpakai": await jumlah_materi(db, user.id),
            "batas": None if tanpa_batas else batas["materi"],
        },
        "ekspor": True if tanpa_batas else batas["ekspor"],
        "token": {
            "bulan_ini": token,
            "harga_per_1000": s.HARGA_RP_PER_1000_TOKEN,
            "estimasi_biaya_rp": round(token / 1000 * s.HARGA_RP_PER_1000_TOKEN) if s.HARGA_RP_PER_1000_TOKEN else None,
        },
    }
