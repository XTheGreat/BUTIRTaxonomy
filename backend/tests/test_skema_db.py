import asyncio
import io
import os
import pathlib
import tempfile

_DIR = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{os.path.join(_DIR, 'uji_skema.db')}"

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect
from sqlalchemy.dialects import postgresql
from sqlalchemy.exc import OperationalError
from sqlalchemy.schema import CreateIndex, CreateTable

import app.database as dbmod
from app.database import Base, tambah_kolom_yang_hilang
import app.main as main

BACKEND = pathlib.Path(__file__).resolve().parents[1]
REVISI_AWAL = "80a03f49a80c"


def cfg(url: str, buffer=None) -> Config:
    c = Config(str(BACKEND / "alembic.ini"), output_buffer=buffer)
    c.set_main_option("script_location", str(BACKEND / "alembic"))
    c.attributes["sqlalchemy_url"] = url
    return c


def sqlite_url(nama: str) -> str:
    return f"sqlite+aiosqlite:///{os.path.join(_DIR, nama)}"


def potret(path: str) -> dict:
    insp = inspect(create_engine(f"sqlite:///{path}"))
    hasil = {}
    for tabel in sorted(insp.get_table_names()):
        if tabel == "alembic_version":
            continue
        hasil[tabel] = {
            "kolom": {c["name"]: (str(c["type"]), c["nullable"]) for c in insp.get_columns(tabel)},
            "pk": sorted(insp.get_pk_constraint(tabel)["constrained_columns"]),
            "indeks": sorted(
                (tuple(i["column_names"]), bool(i["unique"]))
                for i in insp.get_indexes(tabel)
                if not (i["name"] or "").startswith("sqlite_autoindex")
            ),
            "unik": sorted(tuple(u["column_names"]) for u in insp.get_unique_constraints(tabel)),
            "fk": sorted(
                (tuple(f["constrained_columns"]), f["referred_table"], tuple(f["referred_columns"]),
                 (f.get("options") or {}).get("ondelete"))
                for f in insp.get_foreign_keys(tabel)
            ),
        }
    return hasil


def uji_ddl_postgresql():
    dialek = postgresql.dialect()
    ddl = {t.name: str(CreateTable(t).compile(dialect=dialek)) for t in Base.metadata.sorted_tables}
    assert {"users", "peserta_ujian", "log_llm", "token_dicabut", "riwayat_percobaan"} <= set(ddl)
    semua = "\n".join(ddl.values())
    assert "DATETIME" not in semua and "TIMESTAMP WITH TIME ZONE" in semua
    assert "UUID" in semua and "CHAR(32)" not in semua, "Uuid harus jadi tipe UUID asli di PostgreSQL"
    for tabel, kolom in [("butir_soal", "pilihan"), ("debat_log", "output_json"), ("kisi_kisi", "distribusi_bloom")]:
        baris = next(b for b in ddl[tabel].splitlines() if b.strip().startswith(kolom))
        assert "JSONB" in baris, f"{tabel}.{kolom}: {baris.strip()}"
    assert "uq_peserta_paket_nama" in ddl["peserta_ujian"]
    for t in Base.metadata.sorted_tables:
        for idx in t.indexes:
            str(CreateIndex(idx).compile(dialect=dialek))


def uji_migrasi_sama_dengan_model():
    acuan = os.path.join(_DIR, "acuan.db")
    Base.metadata.create_all(create_engine(f"sqlite:///{acuan}"))

    hasil_path = os.path.join(_DIR, "migrasi.db")
    command.upgrade(cfg(sqlite_url("migrasi.db")), "head")
    a, b = potret(acuan), potret(hasil_path)

    assert set(a) == set(b), f"tabel berbeda: hanya model={set(a) - set(b)}, hanya migrasi={set(b) - set(a)}"
    for tabel in a:
        for aspek in ("kolom", "pk", "indeks", "unik", "fk"):
            assert a[tabel][aspek] == b[tabel][aspek], (
                f"{tabel}.{aspek} berbeda\n  model   : {a[tabel][aspek]}\n  migrasi : {b[tabel][aspek]}"
            )


def uji_downgrade_dan_ulang():
    url = sqlite_url("bolak_balik.db")
    path = os.path.join(_DIR, "bolak_balik.db")
    command.upgrade(cfg(url), "head")
    command.downgrade(cfg(url), REVISI_AWAL)
    awal = potret(path)
    assert "peserta_ujian" not in awal and "log_llm" not in awal and "riwayat_percobaan" not in awal
    assert "rilis_hasil" not in awal["paket_ujian"]["kolom"] and "percobaan_ke" not in awal["butir_soal"]["kolom"]
    assert len(awal) == 10, f"tabel migrasi awal harus tetap 10: {sorted(awal)}"
    command.upgrade(cfg(url), "head")
    assert "peserta_ujian" in potret(path)


def uji_sql_postgresql_offline():
    buf = io.StringIO()
    command.upgrade(cfg("postgresql+asyncpg://u:p@localhost/butir", buf), "head", sql=True)
    sql = buf.getvalue()
    assert "CREATE TABLE peserta_ujian" in sql and "CREATE TABLE log_llm" in sql
    assert "ALTER TABLE paket_ujian ADD COLUMN rilis_hasil VARCHAR(10) DEFAULT 'otomatis' NOT NULL" in sql
    for tabel, kolom in [("kisi_kisi", "distribusi_bloom"), ("butir_soal", "pilihan"), ("debat_log", "output_json")]:
        assert f"ALTER TABLE {tabel} ALTER COLUMN {kolom} TYPE JSONB USING {kolom}::jsonb" in sql, (tabel, kolom)
    assert "UUID" in sql and "TIMESTAMP WITH TIME ZONE" in sql
    assert not [b for b in sql.splitlines() if "CHAR(32)" in b and "version_num" not in b]

    buf = io.StringIO()
    command.downgrade(cfg("postgresql+asyncpg://u:p@localhost/butir", buf), "c4f2a91d7e30:80a03f49a80c", sql=True)
    assert "TYPE JSON USING pilihan::json" in buf.getvalue(), "downgrade mengembalikan JSONB ke JSON"


def uji_penambal_kolom_postgresql():
    perintah = []

    class FakeKoneksi:
        dialect = type("D", (), {"name": "postgresql"})()

        def execute(self, stmt):
            perintah.append(str(stmt))

    class FakeInspektor:
        def has_table(self, tabel):
            return True

        def get_columns(self, tabel):
            return [{"name": "id"}]

    asli = dbmod.inspect
    dbmod.inspect = lambda conn: FakeInspektor()
    try:
        tambah_kolom_yang_hilang(FakeKoneksi())
    finally:
        dbmod.inspect = asli
    assert perintah, "tidak ada perintah dijalankan"
    assert any("hasil_dirilis_pada TIMESTAMP WITH TIME ZONE" in p for p in perintah), perintah
    assert not any("DATETIME" in p for p in perintah), "DATETIME tidak dikenal PostgreSQL"
    assert any("rilis_hasil VARCHAR(10) NOT NULL DEFAULT 'otomatis'" in p for p in perintah)


def uji_start_dengan_skema_dari_alembic():
    from sqlalchemy.ext.asyncio import create_async_engine

    s = main.settings
    asli = (s.BUAT_SKEMA_OTOMATIS, main.engine)

    async def start(url: str):
        mesin = create_async_engine(url)
        main.engine = mesin
        from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession
        import app.services.agents.orchestrator as orkes
        orkes.async_session = async_sessionmaker(mesin, class_=AsyncSession, expire_on_commit=False)
        try:
            async with main.app.router.lifespan_context(main.app):
                pass
        finally:
            await mesin.dispose()

    try:
        s.BUAT_SKEMA_OTOMATIS = False
        kosong = sqlite_url("kosong_tanpa_skema.db")
        try:
            asyncio.run(start(kosong))
            raise AssertionError("seharusnya gagal pada database yang belum dimigrasi")
        except OperationalError:
            pass
        assert inspect(create_engine(kosong.replace("+aiosqlite", ""))).get_table_names() == [], "tidak boleh membuat tabel"

        dimigrasi = sqlite_url("dimigrasi.db")
        command.upgrade(cfg(dimigrasi), "head")
        asyncio.run(start(dimigrasi))

        s.BUAT_SKEMA_OTOMATIS = True
        otomatis = sqlite_url("otomatis.db")
        asyncio.run(start(otomatis))
        assert "peserta_ujian" in inspect(create_engine(otomatis.replace("+aiosqlite", ""))).get_table_names()
    finally:
        s.BUAT_SKEMA_OTOMATIS, main.engine = asli


def test_skema_db():
    uji_ddl_postgresql()
    uji_migrasi_sama_dengan_model()
    uji_downgrade_dan_ulang()
    uji_sql_postgresql_offline()
    uji_penambal_kolom_postgresql()
    uji_start_dengan_skema_dari_alembic()


if __name__ == "__main__":
    test_skema_db()
    print("Semua tes skema database lulus.")
