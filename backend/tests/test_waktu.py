import asyncio
import os
import tempfile
import uuid
from datetime import datetime, timedelta, timezone

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_waktu.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"

import httpx

from app.database import Base, UTCDateTime, async_session, engine
from app.main import app
from app.models.butir_soal import ButirSoal
from app.models.kisi_kisi import KisiKisi

WITA = timezone(timedelta(hours=8))
AS = timezone(timedelta(hours=-5))


def punya_zona(teks: str) -> bool:
    return teks.endswith("Z") or teks[-6] in "+-" and teks[-3] == ":"


def parse(teks: str) -> datetime:
    d = datetime.fromisoformat(teks.replace("Z", "+00:00"))
    assert d.tzinfo is not None, f"{teks!r} tidak punya zona"
    return d


def uji_tipe_kolom():
    tipe = UTCDateTime()
    naif = datetime(2026, 10, 24, 9, 0, 0)
    assert tipe.process_bind_param(naif, None) == naif
    assert tipe.process_bind_param(None, None) is None
    aware = datetime(2026, 10, 24, 17, 0, 0, tzinfo=WITA)
    assert tipe.process_bind_param(aware, None) == datetime(2026, 10, 24, 9, 0, 0, tzinfo=timezone.utc)
    dibaca = tipe.process_result_value(naif, None)
    assert dibaca == datetime(2026, 10, 24, 9, 0, 0, tzinfo=timezone.utc) and dibaca.utcoffset() == timedelta(0)
    assert tipe.process_result_value(aware, None) == datetime(2026, 10, 24, 9, 0, 0, tzinfo=timezone.utc)
    assert tipe.process_result_value(None, None) is None


async def _jalankan():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://uji") as c:
        r = await c.post(
            "/api/auth/register",
            json={"nama": "Guru", "email": "guru@example.com", "password": "rahasia123"},
        )
        hdr = {"Authorization": f"Bearer {r.json()['access_token']}"}
        guru = uuid.UUID(r.json()["user"]["id"])
        assert punya_zona(r.json()["user"]["created_at"]), r.json()["user"]["created_at"]

        async with async_session() as db:
            kk = KisiKisi(guru_id=guru, jumlah_butir=1, distribusi_bloom={"C1": 100})
            db.add(kk)
            await db.flush()
            b = ButirSoal(kisi_kisi_id=kk.id, status="diterima", pertanyaan="?", kunci_jawaban="A", level_bloom="C1",
                          pilihan={"A": "a", "B": "b", "C": "c", "D": "d"})
            db.add(b)
            await db.commit()
            butir_id = str(b.id)

        u = await c.post("/api/ujian", headers=hdr, json={"judul": "U", "butir_ids": [butir_id]})
        assert punya_zona(u.json()["created_at"]), u.json()["created_at"]

        mulai = datetime.now(WITA) - timedelta(minutes=5)
        selesai = datetime.now(WITA) + timedelta(hours=2)
        t = await c.post(f"/api/ujian/{u.json()['id']}/terbitkan", headers=hdr,
                         json={"waktu_mulai": mulai.isoformat(), "waktu_selesai": selesai.isoformat()})
        assert t.status_code == 200, t.text
        for kunci, harapan in (("waktu_mulai", mulai), ("waktu_selesai", selesai)):
            teks = t.json()[kunci]
            assert punya_zona(teks), f"{kunci}={teks!r} tanpa zona"
            assert abs((parse(teks) - harapan).total_seconds()) < 1, f"{kunci} bergeser: {teks} vs {harapan}"
        kode = t.json()["kode_akses"]

        daftar = (await c.get("/api/ujian", headers=hdr)).json()
        assert all(punya_zona(x["created_at"]) for x in daftar)
        detail = (await c.get(f"/api/ujian/{u.json()['id']}", headers=hdr)).json()
        assert punya_zona(detail["waktu_selesai"])

        masuk = await c.post("/api/siswa/masuk", json={"kode_akses": kode, "nama_siswa": "Andi"})
        assert masuk.status_code == 200, masuk.text
        sisa = parse(masuk.json()["waktu_selesai"]) - datetime.now(timezone.utc)
        assert timedelta(hours=1, minutes=58) < sisa < timedelta(hours=2, minutes=1), f"sisa waktu salah: {sisa}"
        soal = await c.get(f"/api/siswa/ujian/{kode}/soal", params={"nama_siswa": "Andi"},
                           headers={"X-Peserta-Token": masuk.json()["token_peserta"]})
        assert punya_zona(soal.json()["waktu_selesai"])
        assert abs((parse(soal.json()["waktu_selesai"]) - parse(masuk.json()["waktu_selesai"])).total_seconds()) < 1

        p = (await c.get(f"/api/ujian/{u.json()['id']}/peserta", headers=hdr)).json()
        assert p and punya_zona(p[0]["masuk_pada"]), p
        kk_daftar = (await c.get("/api/kisi-kisi", headers=hdr)).json()
        assert kk_daftar and all(punya_zona(k["created_at"]) for k in kk_daftar)
        butir = (await c.get("/api/butir", headers=hdr)).json()
        assert butir and all(punya_zona(x["created_at"]) and punya_zona(x["updated_at"]) for x in butir)

        u2 = await c.post("/api/ujian", headers=hdr, json={"judul": "U2", "butir_ids": [butir_id]})
        s2 = datetime.now(AS) + timedelta(hours=3)
        t2 = await c.post(f"/api/ujian/{u2.json()['id']}/terbitkan", headers=hdr,
                          json={"waktu_mulai": (datetime.now(AS) - timedelta(minutes=1)).isoformat(),
                                "waktu_selesai": s2.isoformat()})
        assert abs((parse(t2.json()["waktu_selesai"]) - s2).total_seconds()) < 1

    await engine.dispose()


def test_waktu():
    uji_tipe_kolom()
    asyncio.run(_jalankan())


if __name__ == "__main__":
    uji_tipe_kolom()
    asyncio.run(_jalankan())
    print("Semua tes waktu lulus.")
