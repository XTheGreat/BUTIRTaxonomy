import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, ForeignKey, Table, Column, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base, JSONType, UTCDateTime


kisi_kisi_materi = Table(
    "kisi_kisi_materi",
    Base.metadata,
    Column("kisi_kisi_id", Uuid, ForeignKey("kisi_kisi.id", ondelete="CASCADE"), primary_key=True),
    Column("materi_id", Uuid, ForeignKey("materi_ajar.id", ondelete="CASCADE"), primary_key=True),
)


class KisiKisi(Base):
    __tablename__ = "kisi_kisi"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    guru_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    jumlah_butir: Mapped[int] = mapped_column(Integer)
    distribusi_bloom: Mapped[dict] = mapped_column(JSONType)
    cakupan_bab: Mapped[str] = mapped_column(Text, nullable=True)
    nama: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=lambda: datetime.now(timezone.utc)
    )

    materi_list: Mapped[list["Materi"]] = relationship(
        "Materi", secondary=kisi_kisi_materi, lazy="selectin"
    )
