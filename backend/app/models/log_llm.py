import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base, UTCDateTime


class LogLLM(Base):
    __tablename__ = "log_llm"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    waktu: Mapped[datetime] = mapped_column(
        UTCDateTime, default=lambda: datetime.now(timezone.utc), index=True
    )
    guru_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True, index=True)
    butir_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True, index=True)
    percobaan_butir: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ronde: Mapped[int | None] = mapped_column(Integer, nullable=True)

    peran: Mapped[str] = mapped_column(String(20))
    kelompok: Mapped[str] = mapped_column(String(10))
    provider: Mapped[str] = mapped_column(String(20))
    model: Mapped[str] = mapped_column(String(120))
    fallback: Mapped[bool] = mapped_column(Boolean, default=False)

    percobaan_panggilan: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20))
    kode_http: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latensi_ms: Mapped[int] = mapped_column(Integer, default=0)
    token_prompt: Mapped[int | None] = mapped_column(Integer, nullable=True)
    token_jawaban: Mapped[int | None] = mapped_column(Integer, nullable=True)
    token_total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    galat: Mapped[str | None] = mapped_column(String(300), nullable=True)
