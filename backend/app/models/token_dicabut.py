from datetime import datetime, timezone
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base, UTCDateTime


class TokenDicabut(Base):
    __tablename__ = "token_dicabut"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    kedaluwarsa: Mapped[datetime] = mapped_column(UTCDateTime, index=True)
    dicabut_pada: Mapped[datetime] = mapped_column(
        UTCDateTime, default=lambda: datetime.now(timezone.utc)
    )
