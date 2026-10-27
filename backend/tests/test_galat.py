import asyncio
import os
import tempfile

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_galat.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"

import httpx

from app.database import Base, engine
from app.main import app


async def _jalankan():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://uji") as c:
            r = await c.post("/api/auth/login", json={"email": "tidak@ada.com", "password": "salah12345"})
            assert r.status_code == 401, r.text
            j = r.json()
            assert j["kode"] == "kredensial_salah" and j["param"] == {}, j
            assert j["detail"] == "Email atau password salah", "detail tetap kalimat Indonesia"

            r = await c.get("/api/paket/saya", headers={"Authorization": "Bearer sampah"})
            assert r.status_code == 401, r.text
            assert r.json()["kode"] == "token_tidak_valid", r.text

            r = await c.post("/api/auth/register", json={"nama": "Ani", "email": "ani@example.com", "password": "rahasia123"})
            assert r.status_code == 201, r.text
            r = await c.post("/api/auth/register", json={"nama": "Ani", "email": "ani@example.com", "password": "rahasia123"})
            assert r.status_code == 400 and r.json()["kode"] == "email_sudah_terdaftar", r.text

            r = await c.post("/api/auth/reset-password", json={"token": "sampah", "new_password": "baru12345"})
            assert r.status_code == 400 and r.json()["kode"] == "tautan_reset_tidak_valid", r.text

            # Galat yang belum dimigrasi tetap berbentuk lama: detail string, tanpa kode.
            r = await c.post("/api/auth/register", json={"nama": "Bo", "email": "bo@example.com", "password": "lemah"})
            assert r.status_code == 422 and "kode" not in r.json(), r.text
    finally:
        await engine.dispose()


def test_galat():
    asyncio.run(_jalankan())


if __name__ == "__main__":
    asyncio.run(_jalankan())
    print("Semua tes galat lulus.")
