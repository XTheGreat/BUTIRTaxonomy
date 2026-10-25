from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from datetime import timezone

from sqlalchemy import JSON, DateTime, TypeDecorator, inspect, text
from sqlalchemy.dialects.postgresql import JSONB
from app.config import get_settings

settings = get_settings()

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args=connect_args,
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


JSONType = JSON().with_variant(JSONB(), "postgresql")


class UTCDateTime(TypeDecorator):
    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None and value.tzinfo is not None:
            return value.astimezone(timezone.utc)
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


_KOLOM_TAMBAHAN = [
    ("butir_soal", "level_target", "VARCHAR(2)"),
    ("kisi_kisi", "nama", "VARCHAR(255)"),
    ("users", "peran", "VARCHAR(20) NOT NULL DEFAULT 'guru'"),
    ("users", "paket", "VARCHAR(20) NOT NULL DEFAULT 'gratis'"),
    ("users", "institusi_id", "UUID"),
    ("users", "admin_institusi", "BOOLEAN NOT NULL DEFAULT FALSE"),
    ("butir_soal", "percobaan_ke", "INTEGER NOT NULL DEFAULT 1"),
    ("butir_soal", "alasan_tertunda", "TEXT"),
    ("butir_soal", "arsip_meta", "JSON"),
    ("debat_log", "percobaan_ke", "INTEGER NOT NULL DEFAULT 1"),
    ("paket_ujian", "rilis_hasil", "VARCHAR(10) NOT NULL DEFAULT 'otomatis'"),
    ("paket_ujian", "hasil_dirilis_pada", "DATETIME"),
]


def tambah_kolom_yang_hilang(sync_conn) -> None:
    insp = inspect(sync_conn)
    tipe_waktu = "TIMESTAMP WITH TIME ZONE" if sync_conn.dialect.name == "postgresql" else "DATETIME"
    tipe_uuid = "UUID" if sync_conn.dialect.name == "postgresql" else "CHAR(32)"
    for tabel, kolom, ddl in _KOLOM_TAMBAHAN:
        if not insp.has_table(tabel):
            continue
        ada = {c["name"] for c in insp.get_columns(tabel)}
        if kolom not in ada:
            sync_conn.execute(
                text(f"ALTER TABLE {tabel} ADD COLUMN {kolom} {ddl.replace('DATETIME', tipe_waktu).replace('UUID', tipe_uuid)}")
            )


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
