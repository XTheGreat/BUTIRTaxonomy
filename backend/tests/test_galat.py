import asyncio
import os
import tempfile
import uuid

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

            # Validator Pydantic: 422 memuat `type` = kode dan `msg` tetap kalimat Indonesia.
            r = await c.post("/api/auth/register", json={"nama": "Bo", "email": "bo@example.com", "password": "lemah"})
            assert r.status_code == 422, r.text
            d = r.json()["detail"][0]
            assert d["type"] == "validasi_sandi_pendek" and d["msg"] == "Kata sandi minimal 8 karakter", d

            # Validator dengan param: nilai dikirim lewat `ctx` pada respons 422.
            r = await c.post("/api/auth/login", json={"email": "ani@example.com", "password": "rahasia123"})
            hdr = {"Authorization": f"Bearer {r.json()['access_token']}"}
            r = await c.post(
                "/api/kisi-kisi",
                headers=hdr,
                json={"jumlah_butir": 5, "distribusi_bloom": {"C1": 60}, "materi_ids": [str(uuid.uuid4())]},
            )
            assert r.status_code == 422, r.text
            d = r.json()["detail"][0]
            assert d["type"] == "validasi_kisi_total_bloom" and d["ctx"] == {"total": 60}, d
            assert d["msg"] == "Total distribusi Bloom harus 100%, saat ini 60%", d
    finally:
        await engine.dispose()


def test_galat():
    asyncio.run(_jalankan())


if __name__ == "__main__":
    asyncio.run(_jalankan())
    print("Semua tes galat lulus.")
