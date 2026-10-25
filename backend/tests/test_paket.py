import asyncio
import os
import tempfile
import uuid
from datetime import datetime, timedelta, timezone

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_paket.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"
os.environ["ADMIN_EMAILS"] = "admin@example.com"
os.environ["PAKET_GRATIS_SOAL_BULAN"] = "5"
os.environ["PAKET_GRATIS_MATERI"] = "1"
os.environ["HARGA_RP_PER_1000_TOKEN"] = "2"

import httpx

from app.config import get_settings
from app.database import Base, async_session, engine
from app.main import app
from app.models.butir_soal import ButirSoal
from app.models.debat_log import DebatLog
from app.models.kisi_kisi import KisiKisi
from app.models.log_llm import LogLLM


async def _jalankan():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    s = get_settings()

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://uji") as c:
        async def daftar(nama, email):
            r = await c.post("/api/auth/register", json={"nama": nama, "email": email, "password": "rahasia123"})
            assert r.status_code == 201, r.text
            return {"Authorization": f"Bearer {r.json()['access_token']}"}, uuid.UUID(r.json()["user"]["id"])

        hdr, guru = await daftar("Guru", "guru@example.com")
        hdr_admin, admin = await daftar("Admin", "admin@example.com")

        async with async_session() as db:
            kk = KisiKisi(guru_id=guru, jumlah_butir=4, distribusi_bloom={"C1": 100})
            db.add(kk)
            await db.flush()
            async def butir(status, ada_draf, hari_lalu=0):
                b = ButirSoal(kisi_kisi_id=kk.id, status=status, level_bloom="C1", kunci_jawaban="A",
                              pilihan={"A": "a", "B": "b", "C": "c", "D": "d"}, pertanyaan="Soal?")
                db.add(b)
                await db.flush()
                if ada_draf:
                    waktu = datetime.now(timezone.utc) - timedelta(days=hari_lalu)
                    db.add(DebatLog(butir_id=b.id, percobaan_ke=1, ronde=1, agen="penyusun", output_json={}, created_at=waktu))
                    db.add(DebatLog(butir_id=b.id, percobaan_ke=2, ronde=1, agen="penyusun", output_json={}, created_at=waktu))

            for _ in range(2):
                await butir("diterima", True)
            await butir("ditolak", True)
            await butir("tertunda", True)
            await butir("tertunda", False)
            await butir("draft", False)
            await butir("diterima", True, hari_lalu=45)
            kk2 = KisiKisi(guru_id=guru, jumlah_butir=2, distribusi_bloom={"C1": 100})
            db.add(kk2)
            db.add(LogLLM(guru_id=guru, peran="penyusun", kelompok="sekunder", provider="x", model="m", status="sukses",
                          percobaan_panggilan=1, token_total=3000, waktu=datetime.now(timezone.utc)))
            await db.commit()
            kk2_id = kk2.id

        assert s.KUOTA_AKTIF is False
        r = await c.get("/api/paket/saya", headers=hdr)
        j = r.json()
        assert j["paket"] == "gratis" and j["tanpa_batas"] is True and j["soal"]["terpakai"] == 4, j
        assert j["token"]["bulan_ini"] == 3000 and j["token"]["estimasi_biaya_rp"] == 6, j["token"]
        r = await c.get("/api/bank-soal/export?format=pdf", headers=hdr)
        assert r.status_code != 402, "ekspor tidak boleh diblokir saat kuota nonaktif"

        s.KUOTA_AKTIF = True
        r = await c.post(f"/api/kisi-kisi/{kk2_id}/generate", headers=hdr)
        assert r.status_code == 402 and "tinggal 1 dari 5" in r.json()["detail"], r.text

        r = await c.get("/api/paket/saya", headers=hdr)
        j = r.json()
        assert j["tanpa_batas"] is False and j["soal"] == {"terpakai": 4, "batas": 5, "sisa": 1}, j
        assert j["ekspor"] is False and j["materi"]["batas"] == 1

        r = await c.get("/api/bank-soal/export?format=pdf", headers=hdr)
        assert r.status_code == 402 and "paket Pro" in r.json()["detail"], r.text
        r = await c.get("/api/bank-soal/export?format=json", headers=hdr)
        assert r.status_code == 200, r.text

        berkas = {"file": ("a.txt", "isi materi pertama yang cukup panjang untuk diproses.".encode(), "text/plain")}
        r = await c.post("/api/materi", headers=hdr, data={"judul": "M1"}, files=berkas)
        assert r.status_code == 201, r.text
        r = await c.post("/api/materi", headers=hdr, data={"judul": "M2"}, files=berkas)
        assert r.status_code == 402 and "materi ajar" in r.json()["detail"], r.text

        r = await c.get("/api/paket/pengguna", headers=hdr)
        assert r.status_code == 403
        r = await c.put(f"/api/paket/pengguna/{guru}", headers=hdr, json={"paket": "pro"})
        assert r.status_code == 403
        r = await c.put(f"/api/paket/pengguna/{guru}", headers=hdr_admin, json={"paket": "ultra"})
        assert r.status_code == 422
        r = await c.put(f"/api/paket/pengguna/{guru}", headers=hdr_admin, json={"paket": "pro"})
        assert r.status_code == 200 and r.json()["paket"] == "pro"
        r = await c.get("/api/paket/pengguna", headers=hdr_admin)
        daftar_pengguna = {u["email"]: u for u in r.json()}
        assert daftar_pengguna["guru@example.com"]["paket"] == "pro"
        assert daftar_pengguna["guru@example.com"]["soal_bulan_ini"] == 4

        r = await c.get("/api/paket/saya", headers=hdr)
        j = r.json()
        assert j["soal"]["batas"] == 500 and j["ekspor"] is True and j["materi"]["batas"] is None, j
        r = await c.post("/api/materi", headers=hdr, data={"judul": "M2"}, files=berkas)
        assert r.status_code == 201, r.text

        r = await c.get("/api/paket/saya", headers=hdr_admin)
        assert r.json()["tanpa_batas"] is True

    await engine.dispose()
    print("Semua tes paket lulus.")


asyncio.run(_jalankan())
