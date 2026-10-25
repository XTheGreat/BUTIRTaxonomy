import asyncio
import os
import tempfile
import uuid
from datetime import datetime, timedelta, timezone

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_peserta.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"

import httpx

from app.database import Base, async_session, engine
from app.main import app
from app.models.butir_soal import ButirSoal
from app.models.jawaban_siswa import JawabanSiswa
from app.models.kisi_kisi import KisiKisi
from app.models.paket_ujian import PaketUjianButir


def iso(delta: timedelta) -> str:
    return (datetime.now(timezone.utc) + delta).isoformat()


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
            kk = KisiKisi(guru_id=guru, jumlah_butir=2, distribusi_bloom={"C1": 100})
            db.add(kk)
            await db.flush()
            ids = []
            for kunci in ("B", "C"):
                b = ButirSoal(kisi_kisi_id=kk.id, status="diterima", pertanyaan=f"Soal {kunci}?",
                              pilihan={"A": "a", "B": "b", "C": "c", "D": "d"}, kunci_jawaban=kunci, level_bloom="C1")
                db.add(b)
                await db.flush()
                ids.append(str(b.id))
            await db.commit()

        async def ujian_terbit():
            u = await c.post("/api/ujian", headers=hdr, json={"judul": "U", "butir_ids": ids})
            t = await c.post(f"/api/ujian/{u.json()['id']}/terbitkan", headers=hdr,
                             json={"waktu_mulai": iso(-timedelta(minutes=1)), "waktu_selesai": iso(timedelta(hours=2))})
            return u.json()["id"], t.json()["kode_akses"]

        uid, kode = await ujian_terbit()

        async def masuk(nama, token=None, kode_=None):
            badan = {"kode_akses": kode_ or kode, "nama_siswa": nama}
            if token:
                badan["token"] = token
            return await c.post("/api/siswa/masuk", json=badan)

        def tok(t):
            return {"X-Peserta-Token": t}

        async def jawab(nama, token, butir, pilihan, kode_=None):
            return await c.post(f"/api/siswa/ujian/{kode_ or kode}/jawab", params={"nama_siswa": nama},
                                headers=tok(token) if token else {},
                                json={"butir_id": butir, "jawaban_pilihan": pilihan})

        r = await masuk("  Budi   Santoso ")
        assert r.status_code == 200, r.text
        assert r.json()["nama_siswa"] == "Budi Santoso", "spasi dirapikan"
        token_budi = r.json()["token_peserta"]
        assert token_budi and len(token_budi) >= 24

        for variasi in ("budi santoso", "BUDI  SANTOSO", "Budi Santoso"):
            r = await masuk(variasi)
            assert r.status_code == 409 and "sudah dipakai" in r.text, variasi
            assert (await masuk(variasi, token="token-salah")).status_code == 409

        r = await masuk("budi santoso", token=token_budi)
        assert r.status_code == 200 and r.json()["token_peserta"] is None
        assert r.json()["nama_siswa"] == "Budi Santoso", "nama baku dipakai, bukan ketikan ulang"

        r = await masuk("Sari")
        token_sari = r.json()["token_peserta"]
        assert token_sari != token_budi

        assert (await jawab("Budi Santoso", token_budi, ids[0], "B")).status_code == 200
        assert (await jawab("BUDI SANTOSO", token_budi, ids[1], "A")).status_code == 200, "huruf besar/kecil dipetakan ke Budi"
        assert (await jawab("Sari", token_sari, ids[0], "D")).status_code == 200

        for token in (None, "token-salah", token_sari):
            for coba in (
                await jawab("Budi Santoso", token, ids[0], "A"),
                await c.get(f"/api/siswa/ujian/{kode}/soal", params={"nama_siswa": "Budi Santoso"}, headers=tok(token) if token else {}),
                await c.post(f"/api/siswa/ujian/{kode}/submit", params={"nama_siswa": "Budi Santoso"}, headers=tok(token) if token else {}),
                await c.get(f"/api/siswa/ujian/{kode}/hasil", params={"nama_siswa": "Budi Santoso"}, headers=tok(token) if token else {}),
            ):
                assert coba.status_code == 403 and "Sesi peserta tidak valid" in coba.text, (token, coba.text)

        soal = (await c.get(f"/api/siswa/ujian/{kode}/soal", params={"nama_siswa": "budi santoso"}, headers=tok(token_budi))).json()
        assert soal["jawaban_tersimpan"] == {ids[0]: "B", ids[1]: "A"}
        soal = (await c.get(f"/api/siswa/ujian/{kode}/soal", params={"nama_siswa": "Sari"}, headers=tok(token_sari))).json()
        assert soal["jawaban_tersimpan"] == {ids[0]: "D", ids[1]: None}

        for kosong in ("", "   ", "x" * 101):
            assert (await masuk(kosong)).status_code == 422, repr(kosong)

        daftar_p = (await c.get(f"/api/ujian/{uid}/peserta", headers=hdr)).json()
        per_nama = {p["nama_siswa"]: p for p in daftar_p}
        assert set(per_nama) == {"Budi Santoso", "Sari"}
        assert (per_nama["Budi Santoso"]["terjawab"], per_nama["Budi Santoso"]["total_soal"]) == (2, 2)
        assert per_nama["Sari"]["terjawab"] == 1 and per_nama["Sari"]["terkumpul"] is False
        assert all(p["sesi_aktif"] and not p["lama"] and p["id"] for p in daftar_p)
        assert (await c.post(f"/api/siswa/ujian/{kode}/submit", params={"nama_siswa": "Budi Santoso"}, headers=tok(token_budi))).status_code == 200
        per_nama = {p["nama_siswa"]: p for p in (await c.get(f"/api/ujian/{uid}/peserta", headers=hdr)).json()}
        assert per_nama["Budi Santoso"]["terkumpul"] is True and per_nama["Sari"]["terkumpul"] is False
        assert (await c.get(f"/api/ujian/{uid}/peserta", headers=hdr_b)).status_code == 403
        assert (await c.get(f"/api/ujian/{uuid.uuid4()}/peserta", headers=hdr)).status_code == 404
        assert (await c.get(f"/api/ujian/{uid}/peserta")).status_code in (401, 403)

        sari_id = per_nama["Sari"]["id"]
        assert (await c.post(f"/api/ujian/{uid}/peserta/{sari_id}/lepas-sesi", headers=hdr_b)).status_code == 403
        assert (await c.post(f"/api/ujian/{uid}/peserta/{uuid.uuid4()}/lepas-sesi", headers=hdr)).status_code == 404
        r = await c.post(f"/api/ujian/{uid}/peserta/{sari_id}/lepas-sesi", headers=hdr)
        assert r.status_code == 200 and "Sari" in r.text
        assert (await jawab("Sari", token_sari, ids[1], "C")).status_code == 403, "token lama langsung mati"
        assert (await c.get(f"/api/ujian/{uid}/peserta", headers=hdr)).json() is not None
        per_nama = {p["nama_siswa"]: p for p in (await c.get(f"/api/ujian/{uid}/peserta", headers=hdr)).json()}
        assert per_nama["Sari"]["sesi_aktif"] is False

        r = await masuk("sari")
        assert r.status_code == 200 and r.json()["token_peserta"] and r.json()["nama_siswa"] == "Sari"
        token_sari2 = r.json()["token_peserta"]
        assert token_sari2 != token_sari
        soal = (await c.get(f"/api/siswa/ujian/{kode}/soal", params={"nama_siswa": "Sari"}, headers=tok(token_sari2))).json()
        assert soal["jawaban_tersimpan"][ids[0]] == "D", "jawaban sebelum berganti perangkat tetap ada"
        assert (await jawab("Sari", token_sari, ids[1], "C")).status_code == 403, "token lama tidak hidup lagi"
        assert (await jawab("Sari", token_sari2, ids[1], "C")).status_code == 200
        assert (await masuk("Sari")).status_code == 409, "setelah diklaim, nama kembali terlindungi"

        uid2, kode2 = await ujian_terbit()
        r = await masuk("Budi Santoso", token=token_budi, kode_=kode2)
        assert r.status_code == 200 and r.json()["token_peserta"] and r.json()["token_peserta"] != token_budi
        assert (await jawab("Budi Santoso", token_budi, ids[0], "A", kode_=kode2)).status_code == 403

        uid3, kode3 = await ujian_terbit()
        async with async_session() as db:
            for bid in ids:
                db.add(JawabanSiswa(paket_ujian_id=uuid.UUID(uid3), nama_siswa="Siswa Lama", butir_id=uuid.UUID(bid)))
            await db.commit()
        r = await c.get(f"/api/siswa/ujian/{kode3}/soal", params={"nama_siswa": "Siswa Lama"})
        assert r.status_code == 200, "ujian lama tanpa token tidak boleh terkunci"
        lama = [p for p in (await c.get(f"/api/ujian/{uid3}/peserta", headers=hdr)).json() if p["lama"]]
        assert [p["nama_siswa"] for p in lama] == ["Siswa Lama"] and lama[0]["id"] is None
        assert (await c.get(f"/api/siswa/ujian/{kode3}/soal", params={"nama_siswa": "Orang Asing"})).status_code == 403

        uid4, kode4 = await ujian_terbit()
        hasil = await asyncio.gather(*[masuk("Dewi", kode_=kode4) for _ in range(4)])
        kode_status = sorted(r.status_code for r in hasil)
        assert kode_status == [200, 409, 409, 409], kode_status
        assert sum(1 for r in hasil if r.json().get("token_peserta")) == 1
        async with async_session() as db:
            from sqlalchemy import func, select
            n = (await db.execute(select(func.count(JawabanSiswa.id)).where(
                JawabanSiswa.paket_ujian_id == uuid.UUID(uid4), JawabanSiswa.nama_siswa == "Dewi"))).scalar()
        assert n == 2, f"baris jawaban tidak boleh ganda ({n})"

    await engine.dispose()


def test_peserta():
    asyncio.run(_jalankan())


if __name__ == "__main__":
    asyncio.run(_jalankan())
    print("Semua tes peserta lulus.")
