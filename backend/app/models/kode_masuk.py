import uuid
from datetime import datetime, timezone
from sqlalchemy import Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base, UTCDateTime


class KodeMasuk(Base):
    __tablename__ = "kode_masuk"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), index=True)
    kode_hash: Mapped[str] = mapped_column(String(64))
    kedaluwarsa: Mapped[datetime] = mapped_column(UTCDateTime)
    percobaan: Mapped[int] = mapped_column(Integer, default=0)
    dibuat_pada: Mapped[datetime] = mapped_column(UTCDateTime, default=lambda: datetime.now(timezone.utc))
