import asyncio
import os
import tempfile
import uuid
from types import SimpleNamespace

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_rakit.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"

import httpx

from app.database import Base, async_session, engine
from app.main import app
from app.models.butir_soal import ButirSoal
from app.models.kisi_kisi import KisiKisi
from app.services.exam_assembly import rakit_paket


def butir(nama, level="C3", bobot=1, teks=""):
    return SimpleNamespace(
        nama=nama, level_bloom=level, bobot_poin=bobot, pertanyaan=teks or nama, pilihan={}, pembahasan="",
    )


def nama(hasil):
    return [b.nama for b in hasil.terpilih]


def uji_unit():
    bank = [butir(f"b{i}") for i in range(5)]
    h = rakit_paket(bank, 3, {"C3": 100})
    assert nama(h) == ["b0", "b1", "b2"] and not h.ada_cakupan and h.cocok_cakupan == 0

    bank = (
        [butir(f"sel{i}", teks="Sel adalah unit terkecil makhluk hidup") for i in range(3)]
        + [butir(f"newton{i}", teks="Hukum Newton kedua tentang gaya dan percepatan") for i in range(3)]
    )
    h = rakit_paket(bank, 3, {"C3": 100}, cakupan="Hukum Newton")
    assert nama(h) == ["newton0", "newton1", "newton2"], nama(h)
    assert h.ada_cakupan and h.cocok_cakupan == 3

    h = rakit_paket(bank, 5, {"C3": 100}, cakupan="Hukum Newton")
    assert nama(h)[:3] == ["newton0", "newton1", "newton2"] and h.cocok_cakupan == 3, "sisa kuota diisi butir lain"
    assert len(h.terpilih) == 5 and h.kurang_total == 0

    h = rakit_paket(bank, 3, {"C3": 100}, cakupan="astronomi galaksi")
    assert h.ada_cakupan and h.cocok_cakupan == 0 and nama(h) == ["sel0", "sel1", "sel2"], "tak ada yang cocok: urutan asal"

    h = rakit_paket(
        [butir("a", teks="soal"), butir("b", teks="soal")], 1, None, cakupan="optika",
        teks_butir=lambda b: b.pertanyaan + (" optika" if b.nama == "b" else ""),
    )
    assert nama(h) == ["b"]

    bank = [
        butir("c2_biasa", "C2"), butir("c2_newton", "C2", teks="Newton"),
        butir("c4_biasa", "C4"), butir("c4_newton", "C4", teks="Newton"),
    ]
    h = rakit_paket(bank, 2, {"C2": 50, "C4": 50}, cakupan="Newton")
    assert sorted(nama(h)) == ["c2_newton", "c4_newton"]

    bank = [butir(f"b{i}", bobot=w) for i, w in enumerate([1, 1, 2, 3, 5, 5])]
    h = rakit_paket(bank, 3, {"C3": 100}, target_bobot=10)
    assert h.bobot_total == 10 and len(h.terpilih) == 3, (nama(h), h.bobot_total)
    assert rakit_paket(bank, 3, {"C3": 100}).bobot_total == 4, "tanpa target: tiga butir pertama"

    h = rakit_paket(bank, 3, {"C3": 100}, target_bobot=13)
    assert h.bobot_total == 13

    h = rakit_paket(bank, 3, {"C3": 100}, target_bobot=100)
    assert h.bobot_total == 13, "bobot maksimum yang mungkin dari tiga butir (5+5+3)"
    h = rakit_paket(bank, 3, {"C3": 100}, target_bobot=1)
    assert h.bobot_total == 4, "bobot minimum yang mungkin (1+1+2)"

    campur = [butir("a2", "C2", 1), butir("b2", "C2", 9), butir("a4", "C4", 1), butir("b4", "C4", 9)]
    h = rakit_paket(campur, 2, {"C2": 50, "C4": 50}, target_bobot=18)
    assert sorted(b.level_bloom for b in h.terpilih) == ["C2", "C4"] and h.bobot_total == 18

    bank = [butir("rel1", bobot=1, teks="newton"), butir("tak", bobot=9, teks="lain")]
    h = rakit_paket(bank, 1, {"C3": 100}, cakupan="newton", target_bobot=9)
    assert nama(h) == ["rel1"] and h.cocok_cakupan == 1, "kecocokan cakupan didahulukan daripada bobot"

    assert rakit_paket([butir("x", bobot=None)], 1, None, target_bobot=3).bobot_total == 0
    h = rakit_paket([], 3, {"C3": 100}, cakupan="newton", target_bobot=5)
    assert h.terpilih == [] and h.kurang_total == 3 and h.kekurangan == {"C3": 3}


async def uji_api():
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
            kisi_fisika = KisiKisi(guru_id=guru, jumlah_butir=3, distribusi_bloom={"C3": 100}, cakupan_bab="Hukum Newton")
            kisi_bio = KisiKisi(guru_id=guru, jumlah_butir=3, distribusi_bloom={"C3": 100}, cakupan_bab="Fotosintesis")
            db.add_all([kisi_fisika, kisi_bio])
            await db.flush()
            data = [
                (kisi_bio, "Organel apa tempat reaksi terang?", 1),
                (kisi_bio, "Apa hasil akhir siklus calvin?", 2),
                (kisi_fisika, "Satuan gaya dalam SI?", 3),
                (kisi_fisika, "Besaran vektor yang menyebabkan percepatan?", 4),
            ]
            for kisi, teks, bobot in data:
                db.add(ButirSoal(
                    kisi_kisi_id=kisi.id, status="diterima", pertanyaan=teks,
                    pilihan={"A": "a", "B": "b", "C": "c", "D": "d"}, kunci_jawaban="A",
                    level_bloom="C3", bobot_poin=bobot,
                ))
            await db.commit()

        async def rakit(**badan):
            r = await c.post("/api/ujian/rakit-otomatis", headers=hdr,
                             json={"jumlah_butir": 2, "distribusi_bloom": {"C3": 100}, **badan})
            assert r.status_code == 200, r.text
            return r.json()

        h = await rakit(cakupan_bab="Hukum Newton")
        assert h["ada_cakupan"] is True and h["cocok_cakupan"] == 2 and h["total_bobot"] == 7, h
        h = await rakit(cakupan_bab="Fotosintesis")
        assert h["cocok_cakupan"] == 2 and h["total_bobot"] == 3, h

        h = await rakit()
        assert h["ada_cakupan"] is False and h["target_bobot"] is None and h["selisih_bobot"] is None
        h = await rakit(target_bobot=5)
        assert h["total_bobot"] == 5 and h["selisih_bobot"] == 0, h
        h = await rakit(target_bobot=100)
        assert h["total_bobot"] == 7 and h["selisih_bobot"] == -93, "bobot terbesar yang mungkin (3+4)"

        h = await rakit(cakupan_bab="Fotosintesis", target_bobot=1, jumlah_butir=1)
        assert h["cocok_cakupan"] == 1 and h["total_bobot"] == 1

        for salah in ({"target_bobot": 0}, {"target_bobot": -5}, {"cakupan_bab": "x" * 2001}):
            r = await c.post("/api/ujian/rakit-otomatis", headers=hdr,
                             json={"jumlah_butir": 2, "distribusi_bloom": {"C3": 100}, **salah})
            assert r.status_code == 422, salah
        r = await c.post("/api/ujian/rakit-otomatis", headers=hdr_b,
                         json={"jumlah_butir": 2, "distribusi_bloom": {"C3": 100}, "cakupan_bab": "Newton"})
        assert r.json()["butir_ids"] == [] and r.json()["kurang_total"] == 2, "bank guru lain tidak ikut"

    await engine.dispose()


def test_rakit():
    uji_unit()
    asyncio.run(uji_api())


if __name__ == "__main__":
    uji_unit()
    asyncio.run(uji_api())
    print("Semua tes rakit lulus.")
