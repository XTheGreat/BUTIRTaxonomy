import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base, UTCDateTime


class JawabanSiswa(Base):
    __tablename__ = "jawaban_siswa"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    paket_ujian_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("paket_ujian.id"))
    nama_siswa: Mapped[str] = mapped_column(String(255))
    butir_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("butir_soal.id"))
    jawaban_pilihan: Mapped[str | None] = mapped_column(String(1), nullable=True)
    benar: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(
        UTCDateTime, nullable=True
    )
