import asyncio
import os
import sqlite3
import tempfile
import uuid
from datetime import datetime, timedelta, timezone

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_rilis.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"

import httpx
from sqlalchemy import create_engine

from app.database import Base, async_session, engine, tambah_kolom_yang_hilang
from app.main import app
from app.models.butir_soal import ButirSoal
from app.models.kisi_kisi import KisiKisi


def iso(delta: timedelta) -> str:
    return (datetime.now(timezone.utc) + delta).isoformat()


def uji_penambal_kolom():
    berkas = os.path.join(tempfile.mkdtemp(), "lama.db")
    sqlite3.connect(berkas).executescript(
        """
        CREATE TABLE butir_soal (id TEXT PRIMARY KEY);
        CREATE TABLE debat_log (id TEXT PRIMARY KEY);
        CREATE TABLE paket_ujian (id TEXT PRIMARY KEY, judul TEXT);
        INSERT INTO paket_ujian VALUES ('p1', 'Ujian lama');
        """
    )
    sync = create_engine(f"sqlite:///{berkas}")
    with sync.begin() as conn:
        tambah_kolom_yang_hilang(conn)
        tambah_kolom_yang_hilang(conn)
    baris = sqlite3.connect(berkas).execute("SELECT judul, rilis_hasil, hasil_dirilis_pada FROM paket_ujian").fetchall()
    assert baris == [("Ujian lama", "otomatis", None)], "ujian lama tetap memakai perilaku otomatis"
    sync.dispose()


async def _jalankan():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://uji") as c:
        async def daftar(n):
            r = await c.post(
                "/api/auth/register",
                json={"nama": n, "email": f"{n.lower()}@example.com", "password": "rahasia123"},
            )
            return {"Authorization": f"Bearer {r.json()['access_token']}"}, uuid.UUID(r.json()["user"]["id"])

        hdr, guru = await daftar("GuruA")
        hdr_b, _ = await daftar("GuruB")

        async with async_session() as db:
            kk = KisiKisi(guru_id=guru, jumlah_butir=1, distribusi_bloom={"C1": 100})
            db.add(kk)
            await db.flush()
            b = ButirSoal(kisi_kisi_id=kk.id, status="diterima", pertanyaan="1+1?",
                          pilihan={"A": "1", "B": "2", "C": "3", "D": "4"}, kunci_jawaban="B", level_bloom="C1")
            db.add(b)
            await db.commit()
            butir_id = str(b.id)

        async def ujian(rilis=None) -> dict:
            r = await c.post("/api/ujian", headers=hdr, json={"judul": "U", "butir_ids": [butir_id]})
            assert r.status_code == 201, r.text
            return r.json()

        async def terbit(uid, **extra):
            return await c.post(
                f"/api/ujian/{uid}/terbitkan", headers=hdr,
                json={"waktu_mulai": iso(-timedelta(minutes=1)), "waktu_selesai": iso(timedelta(hours=1)), **extra},
            )

        async def siswa_kerjakan(kode, nama="Budi"):
            q = {"nama_siswa": nama}
            masuk = await c.post("/api/siswa/masuk", json={"kode_akses": kode, **q})
            assert masuk.status_code == 200
            tok = {"X-Peserta-Token": masuk.json()["token_peserta"]}
            await c.post(f"/api/siswa/ujian/{kode}/jawab", params=q, headers=tok,
                         json={"butir_id": butir_id, "jawaban_pilihan": "B"})
            assert (await c.post(f"/api/siswa/ujian/{kode}/submit", params=q, headers=tok)).status_code == 200
            return q, tok

        u1 = await ujian()
        assert u1["rilis_hasil"] == "otomatis" and u1["hasil_dirilis"] is True
        r = await terbit(u1["id"])
        assert r.status_code == 200 and r.json()["rilis_hasil"] == "otomatis" and r.json()["hasil_dirilis"] is True
        q, tok = await siswa_kerjakan(r.json()["kode_akses"])
        assert (await c.get(f"/api/siswa/ujian/{r.json()['kode_akses']}/hasil", params=q, headers=tok)).status_code == 200
        r2 = await c.put(f"/api/ujian/{u1['id']}/rilis-hasil", headers=hdr, json={"dirilis": True})
        assert r2.status_code == 409 and "otomatis" in r2.text

        u2 = await ujian()
        r = await terbit(u2["id"], rilis_hasil="manual")
        assert r.status_code == 200 and r.json()["rilis_hasil"] == "manual"
        assert r.json()["hasil_dirilis"] is False and r.json()["hasil_dirilis_pada"] is None
        kode = r.json()["kode_akses"]
        q, tok = await siswa_kerjakan(kode)

        r = await c.get(f"/api/siswa/ujian/{kode}/hasil", params=q, headers=tok)
        assert r.status_code == 423 and "belum dirilis" in r.text, "hasil tertahan, bukan galat akses"
        assert "kunci_jawaban" not in r.text and "skor" not in r.text, "isi hasil tidak bocor saat tertahan"

        masuk_sari = await c.post("/api/siswa/masuk", json={"kode_akses": kode, "nama_siswa": "Sari"})
        assert masuk_sari.status_code == 200
        r = await c.get(f"/api/siswa/ujian/{kode}/hasil", params={"nama_siswa": "Sari"},
                        headers={"X-Peserta-Token": masuk_sari.json()["token_peserta"]})
        assert r.status_code == 403 and "belum dikumpulkan" in r.text

        r = await c.put(f"/api/ujian/{u2['id']}/rilis-hasil", headers=hdr, json={"dirilis": True})
        assert r.status_code == 200 and r.json()["hasil_dirilis"] is True and r.json()["hasil_dirilis_pada"]
        hasil = await c.get(f"/api/siswa/ujian/{kode}/hasil", params=q, headers=tok)
        assert hasil.status_code == 200 and hasil.json()["skor"] == 100

        assert (await c.put(f"/api/ujian/{u2['id']}/rilis-hasil", headers=hdr, json={"dirilis": True})).status_code == 200
        r = await c.put(f"/api/ujian/{u2['id']}/rilis-hasil", headers=hdr, json={"dirilis": False})
        assert r.status_code == 200 and r.json()["hasil_dirilis"] is False
        assert (await c.get(f"/api/siswa/ujian/{kode}/hasil", params=q, headers=tok)).status_code == 423

        assert (await c.put(f"/api/ujian/{u2['id']}/rilis-hasil", headers=hdr_b, json={"dirilis": True})).status_code == 403
        assert (await c.put(f"/api/ujian/{uuid.uuid4()}/rilis-hasil", headers=hdr, json={"dirilis": True})).status_code == 404
        assert (await c.put(f"/api/ujian/{u2['id']}/rilis-hasil", json={"dirilis": True})).status_code in (401, 403)
        draf = await ujian()
        r = await c.put(f"/api/ujian/{draf['id']}/rilis-hasil", headers=hdr, json={"dirilis": True})
        assert r.status_code == 409 and "belum diterbitkan" in r.text
        draf2 = await ujian()
        assert (await terbit(draf2["id"], rilis_hasil="sembarang")).status_code == 422

    await engine.dispose()


def test_rilis_hasil():
    uji_penambal_kolom()
    asyncio.run(_jalankan())


if __name__ == "__main__":
    uji_penambal_kolom()
    asyncio.run(_jalankan())
    print("Semua tes rilis hasil lulus.")
