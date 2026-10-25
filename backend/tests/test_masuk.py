import asyncio
import os
import tempfile

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_masuk.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"

import httpx
from sqlalchemy import select

import app.routers.auth as auth_router
from app.config import get_settings
from app.database import Base, async_session, engine
from app.main import app
from app.models.kode_masuk import KodeMasuk
from app.models.user import User

terkirim: list[tuple[str, str]] = []


async def kirim_palsu(tujuan, kode, menit):
    terkirim.append((tujuan, kode))
    return True


async def _jalankan():
    s = get_settings()
    asli = (s.KODE_MASUK_JEDA_DETIK, s.GOOGLE_CLIENT_ID, auth_router.kirim_email_kode, auth_router.verifikasi_token_google)
    auth_router.kirim_email_kode = kirim_palsu
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://uji") as c:
            m = (await c.get("/api/auth/metode")).json()
            assert m["kode_email"] is True and m["google_client_id"] == s.GOOGLE_CLIENT_ID

            s.KODE_MASUK_JEDA_DETIK = 45
            r = await c.post("/api/auth/kode/minta", json={"email": "Mhs@Student.IK.ac.id"})
            assert r.status_code == 200, r.text
            assert terkirim[-1][0] == "mhs@student.ik.ac.id"
            kode = terkirim[-1][1]
            assert len(kode) == 6 and kode.isdigit()

            r = await c.post("/api/auth/kode/minta", json={"email": "mhs@student.ik.ac.id"})
            assert r.status_code == 429, "jeda antarpermintaan"

            r = await c.post("/api/auth/kode/verifikasi", json={"email": "mhs@student.ik.ac.id", "kode": "000000" if kode != "000000" else "111111"})
            assert r.status_code == 400

            r = await c.post("/api/auth/kode/verifikasi", json={"email": "mhs@student.ik.ac.id", "kode": f" {kode[:3]} {kode[3:]} ", "nama": "Mahasiswa Uji"})
            assert r.status_code == 200, r.text
            sesi = r.json()
            assert sesi["user"]["email"] == "mhs@student.ik.ac.id" and sesi["user"]["nama"] == "Mahasiswa Uji"
            hdr = {"Authorization": f"Bearer {sesi['access_token']}"}
            assert (await c.get("/api/paket/saya", headers=hdr)).status_code == 200

            r = await c.post("/api/auth/kode/verifikasi", json={"email": "mhs@student.ik.ac.id", "kode": kode})
            assert r.status_code == 400, "kode hanya sekali pakai"

            s.KODE_MASUK_JEDA_DETIK = 0
            await c.post("/api/auth/kode/minta", json={"email": "mhs@student.ik.ac.id"})
            kode2 = terkirim[-1][1]
            r = await c.post("/api/auth/kode/verifikasi", json={"email": "mhs@student.ik.ac.id", "kode": kode2})
            assert r.status_code == 200 and r.json()["user"]["id"] == sesi["user"]["id"], "email sama, akun sama"
            async with async_session() as db:
                n = len((await db.execute(select(User).where(User.email == "mhs@student.ik.ac.id"))).scalars().all())
            assert n == 1

            await c.post("/api/auth/kode/minta", json={"email": "salah@example.com"})
            benar = terkirim[-1][1]
            salah = "000000" if benar != "000000" else "111111"
            for _ in range(s.KODE_MASUK_MAKS_SALAH):
                assert (await c.post("/api/auth/kode/verifikasi", json={"email": "salah@example.com", "kode": salah})).status_code == 400
            r = await c.post("/api/auth/kode/verifikasi", json={"email": "salah@example.com", "kode": benar})
            assert r.status_code == 400, "kode terkunci setelah terlalu banyak salah"

            for i in range(s.KODE_MASUK_MAKS_PER_JAM):
                r = await c.post("/api/auth/kode/minta", json={"email": "banyak@example.com"})
            assert r.status_code == 200
            r = await c.post("/api/auth/kode/minta", json={"email": "banyak@example.com"})
            assert r.status_code == 429, "batas permintaan per jam"

            async with async_session() as db:
                tersimpan = (await db.execute(select(KodeMasuk))).scalars().all()
            assert all(k.kode_hash not in {t[1] for t in terkirim} for k in tersimpan), "kode tidak disimpan polos"

            r = await c.post("/api/auth/google", json={"credential": "palsu"})
            assert r.status_code == 401

            async def google_sah(credential):
                return {"email": "Dosen@Kampus.AC.ID", "nama": "Dosen Google"} if credential == "sah" else None

            auth_router.verifikasi_token_google = google_sah
            r = await c.post("/api/auth/google", json={"credential": "sah"})
            assert r.status_code == 200, r.text
            assert r.json()["user"]["email"] == "dosen@kampus.ac.id" and r.json()["user"]["nama"] == "Dosen Google"
            id_google = r.json()["user"]["id"]
            r = await c.post("/api/auth/google", json={"credential": "sah"})
            assert r.json()["user"]["id"] == id_google
            assert (await c.post("/api/auth/google", json={"credential": "lain"})).status_code == 401

            r = await c.post("/api/auth/login", json={"email": "dosen@kampus.ac.id", "password": "Tebakan12345"})
            assert r.status_code == 401, "akun tanpa kata sandi tidak bisa dimasuki lewat kata sandi"

            await c.post("/api/auth/register", json={"nama": "Lama", "email": "lama@example.com", "password": "rahasia123"})
            await c.post("/api/auth/kode/minta", json={"email": "lama@example.com"})
            r = await c.post("/api/auth/kode/verifikasi", json={"email": "lama@example.com", "kode": terkirim[-1][1]})
            assert r.status_code == 200 and r.json()["user"]["nama"] == "Lama", "akun lama tersambung lewat email"
    finally:
        s.KODE_MASUK_JEDA_DETIK, s.GOOGLE_CLIENT_ID, auth_router.kirim_email_kode, auth_router.verifikasi_token_google = asli
        await engine.dispose()


def test_masuk():
    asyncio.run(_jalankan())


if __name__ == "__main__":
    asyncio.run(_jalankan())
    print("Semua tes masuk lulus.")
