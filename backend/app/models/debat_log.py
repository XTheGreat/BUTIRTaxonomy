import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base, JSONType, UTCDateTime


class DebatLog(Base):
    __tablename__ = "debat_log"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    butir_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("butir_soal.id", ondelete="CASCADE")
    )
    percobaan_ke: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    ronde: Mapped[int] = mapped_column(Integer)
    agen: Mapped[str] = mapped_column(String(20))
    output_json: Mapped[dict] = mapped_column(JSONType)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=lambda: datetime.now(timezone.utc)
    )
