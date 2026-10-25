import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base, UTCDateTime


class Materi(Base):
    __tablename__ = "materi_ajar"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    guru_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    judul: Mapped[str] = mapped_column(String(500))
    file_path: Mapped[str] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=lambda: datetime.now(timezone.utc)
    )

    chunks: Mapped[list["MateriChunk"]] = relationship(
        back_populates="materi", cascade="all, delete-orphan"
    )


class MateriChunk(Base):
    __tablename__ = "materi_chunks"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    materi_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("materi_ajar.id", ondelete="CASCADE")
    )
    chunk_index: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)

    materi: Mapped["Materi"] = relationship(back_populates="chunks")
