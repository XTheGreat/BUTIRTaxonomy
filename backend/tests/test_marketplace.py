import asyncio
import os
import tempfile
import uuid

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_market.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"
os.environ["ADMIN_EMAILS"] = "sistem@example.com"
os.environ["MARKETPLACE_KOMISI_PERSEN"] = "10"

import httpx
from sqlalchemy import select

from app.database import Base, async_session, engine
from app.main import app
from app.models.butir_soal import ButirSoal
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
        h_jual, id_jual = await daftar("Penjual")
        h_beli, id_beli = await daftar("Pembeli")
        h_lain, _ = await daftar("Lain")

        async with async_session() as db:
            kk = KisiKisi(guru_id=id_jual, jumlah_butir=4, distribusi_bloom={"C1": 50, "C3": 50})
            db.add(kk)
            await db.flush()
            ids = []
            for n, (lv, st) in enumerate([("C1", "diterima"), ("C1", "diterima"), ("C3", "diterima"), ("C3", "ditandai")]):
                b = ButirSoal(kisi_kisi_id=kk.id, status=st, level_bloom=lv, kunci_jawaban="B",
                              pilihan={"A": "a", "B": "b", "C": "c", "D": "d"}, pertanyaan=f"Soal {n}?", pembahasan="Karena B.")
                db.add(b)
                await db.flush()
                ids.append(b.id)
            kk_lain = KisiKisi(guru_id=id_beli, jumlah_butir=1, distribusi_bloom={"C1": 100})
            db.add(kk_lain)
            await db.flush()
            b_lain = ButirSoal(kisi_kisi_id=kk_lain.id, status="diterima", level_bloom="C1", kunci_jawaban="A",
                               pilihan={"A": "a", "B": "b", "C": "c", "D": "d"}, pertanyaan="Milik pembeli?")
            db.add(b_lain)
            await db.commit()
            id_lain = b_lain.id

        payload = {"judul": "Bank C1 dan C3", "deskripsi": "uji", "harga_rp": 50000}
        r = await c.post("/api/marketplace/listing", headers=h_jual, json={**payload, "butir_ids": [str(ids[0]), str(ids[3])]})
        assert r.status_code == 422, r.text
        r = await c.post("/api/marketplace/listing", headers=h_jual, json={**payload, "butir_ids": [str(id_lain)]})
        assert r.status_code == 422, "butir milik orang lain tidak boleh dijual"
        r = await c.post("/api/marketplace/listing", headers=h_jual, json={**payload, "butir_ids": [str(i) for i in ids[:3]]})
        assert r.status_code == 201, r.text
        berbayar = r.json()
        assert berbayar["jumlah_butir"] == 3 and berbayar["distribusi_bloom"] == {"C1": 2, "C3": 1}
        r = await c.post("/api/marketplace/listing", headers=h_jual,
                         json={"judul": "Gratis C1", "harga_rp": 0, "butir_ids": [str(ids[0]), str(ids[1])]})
        gratis = r.json()

        async with async_session() as db:
            asli = (await db.execute(select(ButirSoal).where(ButirSoal.id == ids[0]))).scalar_one()
            asli.pertanyaan = "SUDAH DIUBAH"
            await db.commit()

        r = await c.get("/api/marketplace/listing", headers=h_jual)
        assert r.json() == []
        r = await c.get("/api/marketplace/listing", headers=h_beli)
        assert {l["judul"] for l in r.json()} == {"Bank C1 dan C3", "Gratis C1"}
        r = await c.get(f"/api/marketplace/listing/{berbayar['id']}", headers=h_beli)
        assert r.status_code == 200 and "kunci_jawaban" not in str(r.json()) and len(r.json()["pratinjau"]) == 2
        assert r.json()["pratinjau"][0]["pertanyaan"] == "Soal 0?", "pratinjau harus dari salinan"

        r = await c.post(f"/api/marketplace/listing/{gratis['id']}/beli", headers=h_jual)
        assert r.status_code == 409
        r = await c.post(f"/api/marketplace/listing/{gratis['id']}/beli", headers=h_beli)
        assert r.status_code == 201 and r.json()["status"] == "selesai", r.text
        r = await c.post(f"/api/marketplace/listing/{gratis['id']}/beli", headers=h_beli)
        assert r.status_code == 409
        r = await c.get("/api/bank-soal", headers=h_beli)
        pertanyaan = {b["pertanyaan"] for b in r.json()}
        assert "Soal 0?" in pertanyaan and "Soal 1?" in pertanyaan and "Milik pembeli?" in pertanyaan, pertanyaan

        r = await c.post(f"/api/marketplace/listing/{berbayar['id']}/beli", headers=h_beli)
        assert r.status_code == 201 and r.json()["status"] == "menunggu_pembayaran", r.text
        assert (r.json()["komisi_rp"], r.json()["pendapatan_penjual_rp"]) == (5000, 45000)
        tid = r.json()["id"]
        r = await c.get("/api/bank-soal", headers=h_beli)
        assert len(r.json()) == 3, "butir berbayar belum boleh masuk sebelum dikonfirmasi"

        r = await c.put(f"/api/marketplace/transaksi/{tid}/konfirmasi", headers=h_beli)
        assert r.status_code == 403
        r = await c.get("/api/marketplace/transaksi?status=menunggu_pembayaran", headers=h_sis)
        assert [t["id"] for t in r.json()] == [tid] and r.json()[0]["pembeli"] == "Pembeli"
        r = await c.put(f"/api/marketplace/transaksi/{tid}/konfirmasi", headers=h_sis)
        assert r.status_code == 200 and r.json()["status"] == "selesai"
        r = await c.put(f"/api/marketplace/transaksi/{tid}/konfirmasi", headers=h_sis)
        assert r.status_code == 409
        r = await c.get("/api/bank-soal", headers=h_beli)
        assert len(r.json()) == 6

        r = await c.get("/api/marketplace/transaksi/saya", headers=h_jual)
        assert r.json()["total_pendapatan_rp"] == 45000 and len(r.json()["penjualan"]) == 2
        r = await c.get("/api/marketplace/transaksi/saya", headers=h_beli)
        assert len(r.json()["pembelian"]) == 2

        r = await c.post(f"/api/marketplace/listing/{berbayar['id']}/beli", headers=h_lain)
        tid2 = r.json()["id"]
        r = await c.put(f"/api/marketplace/transaksi/{tid2}/batalkan", headers=h_sis)
        assert r.json()["status"] == "dibatalkan"
        r = await c.put(f"/api/marketplace/listing/{berbayar['id']}", headers=h_jual, json={"aktif": False})
        assert r.json()["aktif"] is False
        r = await c.post(f"/api/marketplace/listing/{berbayar['id']}/beli", headers=h_lain)
        assert r.status_code == 404
        r = await c.put(f"/api/marketplace/listing/{berbayar['id']}", headers=h_lain, json={"aktif": True})
        assert r.status_code == 404, "pembeli tidak boleh mengubah listing orang lain"

    await engine.dispose()
    print("Semua tes marketplace lulus.")


asyncio.run(_jalankan())
