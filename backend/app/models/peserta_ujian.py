import uuid
from datetime import datetime, timezone
from sqlalchemy import ForeignKey, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base, UTCDateTime


def kunci_nama(nama: str) -> str:
    return " ".join(nama.split()).casefold()


class PesertaUjian(Base):
    __tablename__ = "peserta_ujian"
    __table_args__ = (UniqueConstraint("paket_ujian_id", "nama_kunci", name="uq_peserta_paket_nama"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    paket_ujian_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("paket_ujian.id", ondelete="CASCADE"), index=True
    )
    nama_siswa: Mapped[str] = mapped_column(String(255))
    nama_kunci: Mapped[str] = mapped_column(String(255))
    token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    masuk_pada: Mapped[datetime] = mapped_column(
        UTCDateTime, default=lambda: datetime.now(timezone.utc)
    )
