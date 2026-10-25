import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, JSONType, UTCDateTime


class ListingBank(Base):
    __tablename__ = "listing_bank"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    penjual_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    judul: Mapped[str] = mapped_column(String(255))
    deskripsi: Mapped[str] = mapped_column(Text, default="")
    harga_rp: Mapped[int] = mapped_column(Integer, default=0)
    aktif: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=lambda: datetime.now(timezone.utc))


class ListingButir(Base):
    __tablename__ = "listing_butir"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    listing_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("listing_bank.id", ondelete="CASCADE"))
    urutan: Mapped[int] = mapped_column(Integer)
    pertanyaan: Mapped[str] = mapped_column(Text)
    pilihan: Mapped[dict] = mapped_column(JSONType)
    kunci_jawaban: Mapped[str] = mapped_column(String(1))
    pembahasan: Mapped[str] = mapped_column(Text, default="")
    level_bloom: Mapped[str] = mapped_column(String(2))
    bobot_poin: Mapped[int] = mapped_column(Integer, default=1)


class TransaksiMarketplace(Base):
    __tablename__ = "transaksi_marketplace"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    listing_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("listing_bank.id"))
    pembeli_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    harga_rp: Mapped[int] = mapped_column(Integer)
    komisi_rp: Mapped[int] = mapped_column(Integer)
    pendapatan_penjual_rp: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(25))
    kisi_kisi_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("kisi_kisi.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=lambda: datetime.now(timezone.utc))
    selesai_pada: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
