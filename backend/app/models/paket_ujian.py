import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base, UTCDateTime


class PaketUjianButir(Base):
    __tablename__ = "paket_ujian_butir"

    paket_ujian_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("paket_ujian.id", ondelete="CASCADE"), primary_key=True
    )
    butir_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("butir_soal.id", ondelete="CASCADE"), primary_key=True
    )
    urutan: Mapped[int] = mapped_column(Integer)


class PaketUjian(Base):
    __tablename__ = "paket_ujian"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    guru_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    judul: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(20), default="draft")
    kode_akses: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    waktu_mulai: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    waktu_selesai: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    durasi_menit: Mapped[int] = mapped_column(Integer, default=60)
    rilis_hasil: Mapped[str] = mapped_column(String(10), default="otomatis", server_default="otomatis")
    hasil_dirilis_pada: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=lambda: datetime.now(timezone.utc)
    )

    @property
    def hasil_dirilis(self) -> bool:
        return self.rilis_hasil == "otomatis" or self.hasil_dirilis_pada is not None

    butir_list: Mapped[list["PaketUjianButir"]] = relationship(
        cascade="all, delete-orphan", lazy="selectin"
    )
