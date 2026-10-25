import asyncio
import os
import tempfile
import uuid
from datetime import datetime, timedelta, timezone

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"

import httpx
from sqlalchemy import select

from app.database import Base, async_session, engine
from app.main import app
from app.models.butir_soal import ButirSoal
from app.models.materi import Materi
from app.models.paket_ujian import PaketUjian


def _iso(delta: timedelta) -> str:
    return (datetime.now(timezone.utc) + delta).isoformat()


async def _daftar(client: httpx.AsyncClient, nama: str):
    r = await client.post(
        "/api/auth/register",
        json={"nama": nama, "email": f"{nama.lower()}@example.com", "password": "rahasia123"},
    )
    assert r.status_code == 201, r.text
    data = r.json()
    return {"Authorization": f"Bearer {data['access_token']}"}, data["user"]["id"]


async def _jalankan():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://uji") as c:
        hdr_a, id_a = await _daftar(c, "GuruA")
        hdr_b, _ = await _daftar(c, "GuruB")

        async with async_session() as db:
            materi = Materi(guru_id=uuid.UUID(id_a), judul="Materi A", file_path="x")
            db.add(materi)
            await db.commit()
            materi_id = str(materi.id)

        kk = await c.post(
            "/api/kisi-kisi",
            headers=hdr_a,
            json={"jumlah_butir": 1, "distribusi_bloom": {"C1": 100}, "materi_ids": [materi_id]},
        )
        assert kk.status_code == 201, kk.text
        kk_id = kk.json()["id"]

        async with async_session() as db:
            butir = ButirSoal(
                kisi_kisi_id=uuid.UUID(kk_id),
                status="diterima",
                pertanyaan="1+1=?",
                pilihan={"A": "1", "B": "2", "C": "3", "D": "4"},
                kunci_jawaban="B",
                level_bloom="C1",
            )
            db.add(butir)
            await db.commit()
            butir_id = str(butir.id)

        assert (await c.get("/api/bank-soal", headers=hdr_b)).json() == []
        assert (await c.delete(f"/api/bank-soal/{butir_id}", headers=hdr_b)).status_code == 404
        export_b = await c.get("/api/bank-soal/export?format=json", headers=hdr_b)
        assert export_b.json() == []
        assert (await c.get(f"/api/kisi-kisi/{kk_id}", headers=hdr_b)).status_code == 403
        r = await c.post(
            "/api/kisi-kisi",
            headers=hdr_b,
            json={"jumlah_butir": 1, "distribusi_bloom": {"C1": 100}, "materi_ids": [materi_id]},
        )
        assert r.status_code == 404, "materi guru lain tidak boleh dipakai"
        r = await c.post(
            "/api/ujian", headers=hdr_b, json={"judul": "Curi", "butir_ids": [butir_id]}
        )
        assert r.status_code == 404, "butir guru lain tidak boleh dirakit"

        assert len((await c.get("/api/bank-soal", headers=hdr_a)).json()) == 1
        assert len((await c.get("/api/bank-soal/export?format=json", headers=hdr_a)).json()) == 1

        async def buat_ujian(judul: str) -> str:
            r = await c.post(
                "/api/ujian", headers=hdr_a, json={"judul": judul, "butir_ids": [butir_id]}
            )
            assert r.status_code == 201, r.text
            return r.json()["id"]

        u1 = await buat_ujian("Aktif")
        assert (await c.get(f"/api/ujian/{u1}", headers=hdr_b)).status_code == 403
        assert (await c.get(f"/api/ujian/{u1}/laporan", headers=hdr_b)).status_code == 403
        assert (await c.get(f"/api/ujian/{u1}/peserta-count", headers=hdr_b)).status_code == 404

        r = await c.post(
            f"/api/ujian/{u1}/terbitkan",
            headers=hdr_a,
            json={"waktu_mulai": _iso(timedelta(hours=1)), "waktu_selesai": _iso(timedelta(0))},
        )
        assert r.status_code == 400, "selesai sebelum mulai harus ditolak"

        r = await c.post(
            f"/api/ujian/{u1}/terbitkan",
            headers=hdr_a,
            json={"waktu_mulai": _iso(-timedelta(minutes=1)), "waktu_selesai": _iso(timedelta(hours=1))},
        )
        assert r.status_code == 200, r.text
        kode1 = r.json()["kode_akses"]
        assert (
            await c.post(
                f"/api/ujian/{u1}/terbitkan",
                headers=hdr_a,
                json={"waktu_mulai": _iso(timedelta(0)), "waktu_selesai": _iso(timedelta(hours=1))},
            )
        ).status_code == 409, "ujian yang sudah terbit tidak boleh diterbitkan ulang"
        assert (
            await c.delete(f"/api/bank-soal/{butir_id}", headers=hdr_a)
        ).status_code == 409, "butir di ujian aktif tidak boleh dihapus"

        nama = {"nama_siswa": "Budi"}
        assert (await c.get(f"/api/siswa/ujian/{kode1}/soal", params=nama)).status_code == 403
        masuk = await c.post("/api/siswa/masuk", json={"kode_akses": kode1, **nama})
        assert masuk.status_code == 200
        tok = {"X-Peserta-Token": masuk.json()["token_peserta"]}
        assert (await c.get(f"/api/siswa/ujian/{kode1}/soal", params=nama, headers=tok)).status_code == 200

        assert (await c.get(f"/api/siswa/ujian/{kode1}/hasil", params=nama, headers=tok)).status_code == 403
        r = await c.post(
            f"/api/siswa/ujian/{kode1}/jawab", params=nama, headers=tok,
            json={"butir_id": butir_id, "jawaban_pilihan": "B"},
        )
        assert r.status_code == 200, r.text
        assert (
            await c.post(
                f"/api/siswa/ujian/{kode1}/jawab",
                params=nama,
                headers=tok,
                json={"butir_id": str(uuid.uuid4()), "jawaban_pilihan": "A"},
            )
        ).status_code == 404, "butir di luar ujian harus ditolak"
        assert (await c.post(f"/api/siswa/ujian/{kode1}/submit", params=nama, headers=tok)).status_code == 200
        hasil = (await c.get(f"/api/siswa/ujian/{kode1}/hasil", params=nama, headers=tok)).json()
        assert hasil["total_benar"] == 1 and hasil["skor"] == 100

        nama2 = {"nama_siswa": "Sari"}
        masuk2 = await c.post("/api/siswa/masuk", json={"kode_akses": kode1, **nama2})
        assert masuk2.status_code == 200
        tok2 = {"X-Peserta-Token": masuk2.json()["token_peserta"]}
        await c.post(
            f"/api/siswa/ujian/{kode1}/jawab", params=nama2, headers=tok2,
            json={"butir_id": butir_id, "jawaban_pilihan": "B"},
        )
        async with async_session() as db:
            paket = (await db.execute(select(PaketUjian).where(PaketUjian.id == uuid.UUID(u1)))).scalar_one()
            paket.waktu_mulai = datetime.now(timezone.utc) - timedelta(hours=3)
            paket.waktu_selesai = datetime.now(timezone.utc) - timedelta(hours=2)
            await db.commit()
        r = await c.post(
            f"/api/siswa/ujian/{kode1}/jawab", params=nama2, headers=tok2,
            json={"butir_id": butir_id, "jawaban_pilihan": "A"},
        )
        assert r.status_code == 400, "jawaban setelah waktu habis harus ditolak"
        assert (await c.post("/api/siswa/masuk", json={"kode_akses": kode1, "nama_siswa": "Tono"})).status_code == 400
        hasil2 = await c.get(f"/api/siswa/ujian/{kode1}/hasil", params=nama2, headers=tok2)
        assert hasil2.status_code == 200 and hasil2.json()["total_benar"] == 1

        u2 = await buat_ujian("Belum mulai")
        r = await c.post(
            f"/api/ujian/{u2}/terbitkan",
            headers=hdr_a,
            json={"waktu_mulai": _iso(timedelta(hours=1)), "waktu_selesai": _iso(timedelta(hours=2))},
        )
        assert (
            await c.post("/api/siswa/masuk", json={"kode_akses": r.json()["kode_akses"], **nama})
        ).status_code == 400, "ujian yang belum dimulai harus ditolak"

    await engine.dispose()
    print("Semua tes keamanan lulus.")


def test_keamanan():
    asyncio.run(_jalankan())


if __name__ == "__main__":
    asyncio.run(_jalankan())
