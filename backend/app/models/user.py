import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base, UTCDateTime


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    nama: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255))
    peran: Mapped[str] = mapped_column(String(20), default="guru", server_default="guru")
    paket: Mapped[str] = mapped_column(String(20), default="gratis", server_default="gratis")
    institusi_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("institusi.id"), nullable=True)
    admin_institusi: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=lambda: datetime.now(timezone.utc)
    )
