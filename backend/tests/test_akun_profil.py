import asyncio
import os
import tempfile

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_akun_profil.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"

import httpx

from app.database import Base, engine
from app.main import app


async def _daftar(c, nama, email, password="rahasia123"):
    r = await c.post("/api/auth/register", json={"nama": nama, "email": email, "password": password})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def _jalankan():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://uji") as c:
            hdr = await _daftar(c, "Ani", "ani@example.com")
            hdr_bo = await _daftar(c, "Bo", "bo@example.com")

            assert (await c.patch("/api/auth/saya", json={"nama": "Ani"})).status_code in (401, 403), "wajib login"

            r = await c.patch("/api/auth/saya", headers=hdr, json={"nama": "  Ani   Lestari "})
            assert r.status_code == 200 and r.json()["nama"] == "Ani Lestari", r.text
            assert r.json()["email"] == "ani@example.com"

            r = await c.patch("/api/auth/saya", headers=hdr, json={"nama": "   "})
            assert r.status_code == 422 and r.json()["detail"][0]["type"] == "validasi_nama_kosong", r.text

            # Ganti email butuh kata sandi saat ini.
            r = await c.patch("/api/auth/saya", headers=hdr, json={"email": "baru@example.com"})
            assert r.status_code == 400 and r.json()["kode"] == "akun_password_salah", r.text
            r = await c.patch("/api/auth/saya", headers=hdr, json={"email": "baru@example.com", "password_sekarang": "salah12345"})
            assert r.status_code == 400 and r.json()["kode"] == "akun_password_salah", r.text

            # Email milik akun lain ditolak, tanpa membedakan huruf besar-kecil.
            r = await c.patch("/api/auth/saya", headers=hdr, json={"email": "BO@example.com", "password_sekarang": "rahasia123"})
            assert r.status_code == 400 and r.json()["kode"] == "email_sudah_terdaftar", r.text

            r = await c.patch("/api/auth/saya", headers=hdr, json={"email": "baru@example.com", "password_sekarang": "rahasia123"})
            assert r.status_code == 200 and r.json()["email"] == "baru@example.com", r.text
            r = await c.post("/api/auth/login", json={"email": "baru@example.com", "password": "rahasia123"})
            assert r.status_code == 200, "bisa masuk dengan email baru"
            r = await c.post("/api/auth/login", json={"email": "ani@example.com", "password": "rahasia123"})
            assert r.status_code == 401, "email lama tidak berlaku lagi"

            # Email yang sama (beda huruf) bukan perubahan akun lain, jadi tak butuh kata sandi.
            r = await c.patch("/api/auth/saya", headers=hdr, json={"email": "Baru@example.com"})
            assert r.status_code == 200 and r.json()["email"] == "baru@example.com", "email tersimpan tidak berubah"

            # Ganti kata sandi.
            r = await c.post("/api/auth/ganti-password", headers=hdr, json={"password_sekarang": "salah12345", "password_baru": "kataBaru123"})
            assert r.status_code == 400 and r.json()["kode"] == "akun_password_salah", r.text
            r = await c.post("/api/auth/ganti-password", headers=hdr, json={"password_sekarang": "rahasia123", "password_baru": "rahasia123"})
            assert r.status_code == 400 and r.json()["kode"] == "akun_password_sama", r.text
            r = await c.post("/api/auth/ganti-password", headers=hdr, json={"password_sekarang": "rahasia123", "password_baru": "lemah"})
            assert r.status_code == 422 and r.json()["detail"][0]["type"] == "validasi_sandi_pendek", r.text
            r = await c.post("/api/auth/ganti-password", headers=hdr, json={"password_sekarang": "rahasia123", "password_baru": "kataBaru123"})
            assert r.status_code == 200, r.text
            assert (await c.post("/api/auth/login", json={"email": "baru@example.com", "password": "kataBaru123"})).status_code == 200
            assert (await c.post("/api/auth/login", json={"email": "baru@example.com", "password": "rahasia123"})).status_code == 401

            # Akun lain tidak terpengaruh.
            r = await c.patch("/api/auth/saya", headers=hdr_bo, json={"nama": "Bo Baru"})
            assert r.status_code == 200 and r.json()["email"] == "bo@example.com", r.text
    finally:
        await engine.dispose()


def test_akun_profil():
    asyncio.run(_jalankan())


if __name__ == "__main__":
    asyncio.run(_jalankan())
    print("Semua tes akun profil lulus.")
