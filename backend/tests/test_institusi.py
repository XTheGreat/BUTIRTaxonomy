import asyncio
import os
import tempfile
import uuid

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_institusi.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"
os.environ["ADMIN_EMAILS"] = "sistem@example.com"
os.environ["KUOTA_AKTIF"] = "true"
os.environ["PAKET_GRATIS_SOAL_BULAN"] = "2"
os.environ["PAKET_PRO_SOAL_BULAN"] = "3"

import httpx

from app.database import Base, async_session, engine
from app.main import app
from app.models.butir_soal import ButirSoal
from app.models.debat_log import DebatLog
from app.models.kisi_kisi import KisiKisi


async def _jalankan():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://uji") as c:
        async def daftar(nama):
            r = await c.post(
                "/api/auth/register",
                json={"nama": nama, "email": f"{nama.lower()}@example.com", "password": "rahasia123"},
            )
            assert r.status_code == 201, r.text
            return {"Authorization": f"Bearer {r.json()['access_token']}"}, uuid.UUID(r.json()["user"]["id"])

        h_sis, _ = await daftar("Sistem")
        h_kepala, id_kepala = await daftar("Kepala")
        h_a, id_a = await daftar("Anggota")
        h_b, id_b = await daftar("Orang")
        h_c, id_c = await daftar("Lain")

        r = await c.post("/api/institusi", headers=h_kepala, json={"nama": "SMA 1", "kursi": 2, "email_admin": "kepala@example.com"})
        assert r.status_code == 403
        r = await c.post("/api/institusi", headers=h_sis, json={"nama": "SMA 1", "kursi": 2, "email_admin": "tidakada@example.com"})
        assert r.status_code == 404
        r = await c.post("/api/institusi", headers=h_sis, json={"nama": "SMA 1", "kursi": 2, "email_admin": "kepala@example.com"})
        assert r.status_code == 201, r.text
        inst = r.json()
        assert inst["anggota"] == 1 and inst["kursi"] == 2, inst
        iid = inst["id"]

        r = await c.post(f"/api/institusi/{iid}/anggota", headers=h_a, json={"email": "orang@example.com"})
        assert r.status_code == 403, "anggota biasa tidak boleh menambah anggota"
        r = await c.post(f"/api/institusi/{iid}/anggota", headers=h_kepala, json={"email": "anggota@example.com"})
        assert r.status_code == 201, r.text
        r = await c.post(f"/api/institusi/{iid}/anggota", headers=h_kepala, json={"email": "orang@example.com"})
        assert r.status_code == 409 and "Kursi penuh" in r.json()["detail"], r.text

        r = await c.post("/api/institusi", headers=h_sis, json={"nama": "SMA 2", "kursi": 5, "email_admin": "anggota@example.com"})
        assert r.status_code == 409

        r = await c.get("/api/paket/saya", headers=h_a)
        j = r.json()
        assert j["paket"] == "pro" and j["institusi"]["nama"] == "SMA 1" and j["soal"]["batas"] == 6, j
        r = await c.get("/api/paket/saya", headers=h_b)
        assert r.json()["paket"] == "gratis" and r.json()["soal"]["batas"] == 2

        async with async_session() as db:
            for guru in (id_kepala, id_a):
                kk = KisiKisi(guru_id=guru, jumlah_butir=2, distribusi_bloom={"C1": 100})
                db.add(kk)
                await db.flush()
                for _ in range(2):
                    b = ButirSoal(kisi_kisi_id=kk.id, status="diterima", level_bloom="C1", kunci_jawaban="A",
                                  pilihan={"A": "a", "B": "b", "C": "c", "D": "d"}, pertanyaan="S?")
                    db.add(b)
                    await db.flush()
                    db.add(DebatLog(butir_id=b.id, percobaan_ke=1, ronde=1, agen="penyusun", output_json={}))
            kk_baru = KisiKisi(guru_id=id_a, jumlah_butir=3, distribusi_bloom={"C1": 100})
            db.add(kk_baru)
            await db.commit()
            kk_baru_id = kk_baru.id
        r = await c.get("/api/paket/saya", headers=h_kepala)
        assert r.json()["soal"] == {"terpakai": 4, "batas": 6, "sisa": 2}, r.json()
        r = await c.post(f"/api/kisi-kisi/{kk_baru_id}/generate", headers=h_a)
        assert r.status_code == 402 and "institusi SMA 1" in r.json()["detail"] and "tinggal 2 dari 6" in r.json()["detail"], r.text

        r = await c.get("/api/institusi/saya", headers=h_kepala)
        assert r.json()["bisa_kelola"] is True and len(r.json()["anggota_daftar"]) == 2
        assert r.json()["anggota_daftar"][0]["admin_institusi"] is True
        r = await c.get("/api/institusi/saya", headers=h_a)
        assert r.json()["bisa_kelola"] is False
        assert (await c.get("/api/institusi/saya", headers=h_b)).json() is None

        r = await c.delete(f"/api/institusi/{iid}/anggota/{id_kepala}", headers=h_kepala)
        assert r.status_code == 403
        r = await c.delete(f"/api/institusi/{iid}/anggota/{id_a}", headers=h_a)
        assert r.status_code == 403
        r = await c.delete(f"/api/institusi/{iid}/anggota/{id_a}", headers=h_kepala)
        assert r.status_code == 204
        r = await c.get("/api/paket/saya", headers=h_a)
        assert r.json()["paket"] == "gratis" and r.json()["institusi"] is None

        r = await c.put(f"/api/institusi/{iid}", headers=h_sis, json={"kursi": 0})
        assert r.status_code == 422
        r = await c.put(f"/api/institusi/{iid}", headers=h_sis, json={"aktif": False})
        assert r.status_code == 200 and r.json()["aktif"] is False
        r = await c.get("/api/paket/saya", headers=h_kepala)
        assert r.json()["paket"] == "gratis" and r.json()["institusi"] is None, r.json()
        r = await c.post(f"/api/institusi/{iid}/anggota", headers=h_kepala, json={"email": "orang@example.com"})
        assert r.status_code == 409 and "tidak aktif" in r.json()["detail"]
        r = await c.get("/api/institusi", headers=h_sis)
        assert [i["nama"] for i in r.json()] == ["SMA 1"]
        r = await c.get("/api/institusi", headers=h_kepala)
        assert r.status_code == 403

    await engine.dispose()
    print("Semua tes institusi lulus.")


asyncio.run(_jalankan())
