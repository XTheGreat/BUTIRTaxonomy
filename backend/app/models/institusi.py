import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, UTCDateTime


class Institusi(Base):
    __tablename__ = "institusi"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    nama: Mapped[str] = mapped_column(String(255))
    kursi: Mapped[int] = mapped_column(Integer, default=1)
    aktif: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=lambda: datetime.now(timezone.utc))
