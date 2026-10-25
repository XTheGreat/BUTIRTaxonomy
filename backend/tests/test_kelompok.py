import asyncio
import os
import tempfile
import uuid
from datetime import datetime, timedelta, timezone

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///" + os.path.join(tempfile.mkdtemp(), "uji_kelompok.db")

import httpx

from app.database import Base, async_session, engine
from app.main import app
from app.models.butir_soal import ButirSoal
from app.models.kisi_kisi import KisiKisi


async def _jalankan():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://uji") as c:
        async def daftar(n):
            r = await c.post("/api/auth/register", json={"nama": n, "email": f"{n.lower()}@example.com", "password": "rahasia123"})
            return {"Authorization": f"Bearer {r.json()['access_token']}"}, uuid.UUID(r.json()["user"]["id"])

        hdr, guru = await daftar("GuruA")
        hdr_b, guru_b = await daftar("GuruB")

        berkas = {"file": ("fisika.txt", "Materi fisika dasar yang cukup panjang untuk diproses sistem.".encode(), "text/plain")}
        m = await c.post("/api/materi", headers=hdr, data={"judul": "Fisika Dasar"}, files=berkas)
        assert m.status_code == 201, m.text
        materi_id = m.json()["id"]

        payload = {"jumlah_butir": 3, "distribusi_bloom": {"C1": 100}, "materi_ids": [materi_id]}
        r = await c.post("/api/kisi-kisi", headers=hdr, json={**payload, "nama": "  Kisi-kisi A  "})
        assert r.status_code == 201 and r.json()["nama"] == "Kisi-kisi A", r.text
        id_a = uuid.UUID(r.json()["id"])
        r = await c.post("/api/kisi-kisi", headers=hdr, json=payload)
        assert r.json()["nama"] is None
        id_b = uuid.UUID(r.json()["id"])
        r = await c.put(f"/api/kisi-kisi/{id_b}", headers=hdr, json={**payload, "nama": "Kisi-kisi B"})
        assert r.json()["nama"] == "Kisi-kisi B"
        await c.put(f"/api/kisi-kisi/{id_b}", headers=hdr, json=payload)
        r = await c.post("/api/kisi-kisi", headers=hdr, json={**payload, "nama": "Kisi-kisi C"})
        id_c = uuid.UUID(r.json()["id"])

        sekarang = datetime.now(timezone.utc)
        async with async_session() as db:
            async def butir(kk, status, menit):
                b = ButirSoal(kisi_kisi_id=kk, status=status, level_bloom="C1", kunci_jawaban="A",
                              pilihan={"A": "a", "B": "b", "C": "c", "D": "d"}, pertanyaan=f"{status}-{menit}?",
                              created_at=sekarang + timedelta(minutes=menit))
                db.add(b)
                await db.flush()
                return b.id
            await butir(id_a, "diterima", 1)
            await butir(id_a, "diterima", 2)
            id_tandai = await butir(id_a, "ditandai", 3)
            await butir(id_a, "tertunda", 4)
            await butir(id_b, "diterima", 5)
            await butir(id_c, "ditandai", 6)
            kk_lain = KisiKisi(guru_id=guru_b, jumlah_butir=1, distribusi_bloom={"C1": 100}, nama="Milik B")
            db.add(kk_lain)
            await db.flush()
            db.add(ButirSoal(kisi_kisi_id=kk_lain.id, status="diterima", level_bloom="C1", kunci_jawaban="A",
                             pilihan={"A": "a", "B": "b", "C": "c", "D": "d"}, pertanyaan="lain?"))
            await db.commit()

        async def kelompok():
            r = await c.get("/api/bank-soal/kelompok", headers=hdr)
            assert r.status_code == 200, r.text
            return r.json()

        k = await kelompok()
        assert [g["label"] for g in k] == ["Fisika Dasar", "Kisi-kisi A"], k
        assert [g["jumlah_diterima"] for g in k] == [1, 2]
        assert [g["urutan"] for g in k] == [3 - 1, 1] or [g["urutan"] for g in k] == [2, 1], [g["urutan"] for g in k]
        assert all(g["nama"] != "Milik B" for g in k)

        r = await c.get("/api/bank-soal", headers=hdr)
        ids_kelompok = {g["id"] for g in k}
        assert len(r.json()) == 3 and {b["kisi_kisi_id"] for b in r.json()} == ids_kelompok

        r = await c.patch(f"/api/butir/{id_tandai}", headers=hdr, json={"status": "diterima"})
        assert r.status_code == 200, r.text
        k = await kelompok()
        a = next(g for g in k if g["nama"] == "Kisi-kisi A")
        assert a["jumlah_diterima"] == 3 and a["urutan"] == 1, k

        r = await c.get("/api/bank-soal/kelompok", headers=hdr_b)
        assert [g["label"] for g in r.json()] == ["Milik B"]
        assert (await c.get("/api/bank-soal/kelompok")).status_code in (401, 403)

    await engine.dispose()
    print("Semua tes kelompok lulus.")


asyncio.run(_jalankan())
