import asyncio
import os
import tempfile
import uuid

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///" + os.path.join(tempfile.mkdtemp(), "uji_live.db")

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
        async def daftar(n):
            r = await c.post("/api/auth/register", json={"nama": n, "email": f"{n.lower()}@example.com", "password": "rahasia123"})
            return {"Authorization": f"Bearer {r.json()['access_token']}"}, uuid.UUID(r.json()["user"]["id"])

        hdr, guru = await daftar("GuruA")
        hdr_b, _ = await daftar("GuruB")

        async with async_session() as db:
            kk = KisiKisi(guru_id=guru, jumlah_butir=1, distribusi_bloom={"C4": 100})
            db.add(kk)
            await db.flush()
            b = ButirSoal(kisi_kisi_id=kk.id, status="draft", level_bloom="C4", percobaan_ke=1)
            db.add(b)
            await db.commit()
            bid = b.id

        async def tambah(ronde, agen, isi=None, percobaan=1):
            async with async_session() as db:
                db.add(DebatLog(butir_id=bid, percobaan_ke=percobaan, ronde=ronde, agen=agen, output_json=isi or {"x": 1}))
                await db.commit()

        async def set_status(s, ronde=0):
            async with async_session() as db:
                butir = await db.get(ButirSoal, bid)
                butir.status, butir.ronde_saat_ini = s, ronde
                await db.commit()

        async def live():
            r = await c.get(f"/api/butir/{bid}/debat-live", headers=hdr)
            assert r.status_code == 200, r.text
            return r.json()

        j = await live()
        assert j["menunggu_giliran"] is True and j["sedang_berpikir"] is None and j["pesan"] == []

        await set_status("debating", 1)
        assert (await live())["sedang_berpikir"] == {"ronde": 1, "agen": ["penyusun"]}

        await tambah(1, "penyusun", {"pertanyaan": "Q?"})
        j = await live()
        assert j["sedang_berpikir"] == {"ronde": 1, "agen": ["kritikus", "penjawab_buta"]}
        assert [p["agen"] for p in j["pesan"]] == ["penyusun"] and j["pesan"][0]["output_json"]["pertanyaan"] == "Q?"

        await tambah(1, "penjawab_buta")
        assert (await live())["sedang_berpikir"] == {"ronde": 1, "agen": ["kritikus"]}

        await tambah(1, "kritikus")
        assert (await live())["sedang_berpikir"] == {"ronde": 1, "agen": ["arbiter"]}

        await tambah(1, "arbiter", {"verdict": "revisi"})
        assert (await live())["sedang_berpikir"] == {"ronde": 2, "agen": ["penyusun"]}

        for agen in ("penyusun", "kritikus", "penjawab_buta"):
            await tambah(2, agen)
        await tambah(2, "arbiter", {"verdict": "diterima"})
        j = await live()
        assert j["sedang_berpikir"] is None and len(j["pesan"]) == 8

        max_r = j["max_ronde"]
        await tambah(max_r, "arbiter", {"verdict": "revisi"})
        assert (await live())["sedang_berpikir"] is None

        await set_status("tertunda")
        async with async_session() as db:
            butir = await db.get(ButirSoal, bid)
            butir.alasan_tertunda = "Panggilan gagal"
            await db.commit()
        j = await live()
        assert j["sedang_berpikir"] is None and j["alasan_tertunda"] == "Panggilan gagal"

        await tambah(1, "penyusun", {"lama": True}, percobaan=0)
        assert all("lama" not in p["output_json"] for p in (await live())["pesan"])

        r = await c.get(f"/api/butir/{bid}/debat-live", headers=hdr_b)
        assert r.status_code in (403, 404)
        r = await c.get(f"/api/butir/{bid}/debat-live")
        assert r.status_code in (401, 403)

    await engine.dispose()
    print("Semua tes debat live lulus.")


asyncio.run(_jalankan())
