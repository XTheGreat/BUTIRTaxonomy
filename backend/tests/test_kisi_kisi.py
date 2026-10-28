import asyncio
import os
import tempfile
import uuid

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_kisi.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"

import httpx

import app.services.agents.orchestrator as orkes
import app.services.agents.penyusun as mod_penyusun
from app.database import Base, async_session, engine
from app.main import app
from app.models.butir_soal import ButirSoal
from app.models.kisi_kisi import KisiKisi, kisi_kisi_materi
from app.models.materi import Materi, MateriChunk
from app.services.cakupan import kata_kunci, pilih_potongan, skor_potongan

POTONGAN = [
    "Hukum Newton pertama menyatakan benda diam tetap diam bila tidak ada gaya luar. "
    "Sebaliknya benda yang bergerak lurus beraturan tetap bergerak dengan kecepatan tetap selama tidak ada gaya luar yang bekerja.",
    "Hukum Newton kedua: percepatan benda sebanding dengan gaya dan berbanding terbalik dengan massa. "
    "Pada bidang miring gaya penyebab gerak adalah komponen berat sejajar bidang.",
    "Fotosintesis terjadi di kloroplas dan menghasilkan glukosa serta oksigen. "
    "Proses ini membutuhkan cahaya matahari, air, dan karbon dioksida yang diserap tumbuhan dari udara sekitarnya.",
    "Bidang miring adalah pesawat sederhana yang mengurangi gaya yang diperlukan untuk mengangkat beban. "
    "Contohnya tanjakan yang dipakai untuk menaikkan barang berat ke atas truk dengan tenaga lebih kecil.",
]


class P:
    def __init__(self, content):
        self.content = content


def uji_cakupan():
    assert kata_kunci(None) == [] and kata_kunci("") == [] and kata_kunci("   ") == []
    assert kata_kunci("Fokuskan pada Hukum Newton II dan bidang miring") == ["hukum", "newton", "bidang", "miring"][:0] + [
        k for k in kata_kunci("Fokuskan pada Hukum Newton II dan bidang miring")
    ]
    kk = kata_kunci("Fokuskan pada Hukum Newton II, bidang miring dan hukum")
    assert kk == ["hukum", "newton", "bidang", "miring"], f"kata umum dibuang, duplikat dibuang, urutan dijaga: {kk}"
    assert "ii" not in kk, "angka Romawi pendek bukan kata kunci"
    assert kata_kunci("bab 3") == ["3"], "angka bab dipertahankan"

    assert skor_potongan("hukum newton kedua", ["hukum", "newton", "bidang"]) == 2 / 3
    assert skor_potongan("DiTerapkan pada benda", ["terap"]) == 1.0, "kecocokan substring, tak peka huruf besar"
    assert skor_potongan("apa saja", []) == 0.0

    potongan = [P(t) for t in POTONGAN]
    terpilih, cocok = pilih_potongan(potongan, "Hukum Newton dan bidang miring")
    assert cocok and [p.content for p in terpilih][0] == POTONGAN[1], "yang paling cocok lebih dulu"
    assert POTONGAN[2] not in [p.content for p in terpilih], "potongan tak relevan dibuang"

    for cakupan in (None, "", "astronomi galaksi"):
        semua, cocok = pilih_potongan(potongan, cakupan)
        assert not cocok and [p.content for p in semua] == POTONGAN, cakupan


async def _jalankan():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://uji") as c:
        async def daftar(nama):
            r = await c.post(
                "/api/auth/register",
                json={"nama": nama, "email": f"{nama.lower()}@example.com", "password": "rahasia123"},
            )
            return {"Authorization": f"Bearer {r.json()['access_token']}"}, uuid.UUID(r.json()["user"]["id"])

        hdr_a, id_a = await daftar("GuruA")
        hdr_b, id_b = await daftar("GuruB")

        async def materi(guru_id, judul, isi):
            async with async_session() as db:
                m = Materi(guru_id=guru_id, judul=judul, file_path="x")
                db.add(m)
                await db.flush()
                for i, teks in enumerate(isi):
                    db.add(MateriChunk(materi_id=m.id, chunk_index=i, content=teks))
                await db.commit()
                return str(m.id)

        fisika = await materi(id_a, "Fisika Dasar", POTONGAN)
        biologi = await materi(id_a, "Biologi", ["Sel adalah unit kehidupan terkecil."])
        milik_b = await materi(id_b, "Materi B", ["rahasia"])

        def badan(**ubah):
            b = {"jumlah_butir": 3, "distribusi_bloom": {"C2": 50, "C3": 50}, "cakupan_bab": "Hukum Newton",
                 "materi_ids": [fisika]}
            b.update(ubah)
            return b

        for salah, kata in [
            (badan(jumlah_butir=0), "greater"),
            (badan(jumlah_butir=51), "less"),
            (badan(materi_ids=[]), "at least 1"),
            (badan(distribusi_bloom={"C2": 50}), "100%"),
            (badan(distribusi_bloom={"C9": 100}), "tidak valid"),
            (badan(distribusi_bloom={"C2": 150, "C3": -50}), "negatif"),
            (badan(cakupan_bab="x" * 2001), "at most"),
        ]:
            r = await c.post("/api/kisi-kisi", headers=hdr_a, json=salah)
            assert r.status_code == 422, salah
            assert kata in r.text, f"{kata!r} tidak ada di {r.text[:200]}"
        r = await c.post("/api/kisi-kisi", headers=hdr_a, json=badan(materi_ids=[milik_b]))
        assert r.status_code == 404, "materi guru lain"

        r = await c.post("/api/kisi-kisi", headers=hdr_a, json=badan(cakupan_bab="   ", materi_ids=[fisika, fisika, biologi]))
        assert r.status_code == 201, r.text
        assert r.json()["cakupan_bab"] is None, "cakupan kosong disimpan sebagai null"
        draf_id = r.json()["id"]

        daftar_a = (await c.get("/api/kisi-kisi", headers=hdr_a)).json()
        assert [k["id"] for k in daftar_a] == [draf_id]
        item = daftar_a[0]
        assert sorted(m["judul"] for m in item["materi"]) == ["Biologi", "Fisika Dasar"], "materi ganda digabung"
        assert (item["butir_dibuat"], item["butir_berjalan"]) == (0, 0)
        assert (await c.get("/api/kisi-kisi", headers=hdr_b)).json() == []
        assert (await c.get("/api/kisi-kisi")).status_code in (401, 403)

        r = await c.put(f"/api/kisi-kisi/{draf_id}", headers=hdr_a, json=badan(jumlah_butir=7, cakupan_bab="Bidang miring"))
        assert r.status_code == 200, r.text
        assert (r.json()["jumlah_butir"], r.json()["cakupan_bab"]) == (7, "Bidang miring")
        item = (await c.get("/api/kisi-kisi", headers=hdr_a)).json()[0]
        assert [m["judul"] for m in item["materi"]] == ["Fisika Dasar"], "materi diganti sesuai permintaan"
        assert (await c.put(f"/api/kisi-kisi/{draf_id}", headers=hdr_b, json=badan())).status_code == 403
        assert (await c.put(f"/api/kisi-kisi/{draf_id}", headers=hdr_a, json=badan(jumlah_butir=0))).status_code == 422
        assert (await c.put(f"/api/kisi-kisi/{uuid.uuid4()}", headers=hdr_a, json=badan())).status_code == 404

        r = await c.post("/api/kisi-kisi/cek-cakupan", headers=hdr_a,
                         json={"materi_ids": [fisika], "cakupan_bab": "Hukum Newton dan bidang miring"})
        assert r.status_code == 200, r.text
        assert r.json()["ada_cakupan"] is True and r.json()["jumlah_potongan"] == 4
        assert 1 <= r.json()["potongan_cocok"] <= 3
        r = await c.post("/api/kisi-kisi/cek-cakupan", headers=hdr_a,
                         json={"materi_ids": [fisika], "cakupan_bab": "astronomi galaksi"})
        assert r.json()["potongan_cocok"] == 0 and r.json()["ada_cakupan"] is True
        r = await c.post("/api/kisi-kisi/cek-cakupan", headers=hdr_a, json={"materi_ids": [fisika]})
        assert r.json() == {"ada_cakupan": False, "kata_kunci": [], "jumlah_potongan": 4, "potongan_cocok": 0}
        assert (await c.post("/api/kisi-kisi/cek-cakupan", headers=hdr_a,
                             json={"materi_ids": [milik_b], "cakupan_bab": "x"})).status_code == 404

        dipakai: list[str] = []

        async def rekam(butir_id, level, chunk, kisi_id=None):
            dipakai.append(chunk)

        asli = orkes.proses_satu_butir
        orkes.proses_satu_butir = rekam
        try:
            async def kisi(cakupan, jumlah=3):
                r = await c.post("/api/kisi-kisi", headers=hdr_a, json=badan(cakupan_bab=cakupan, jumlah_butir=jumlah))
                return uuid.UUID(r.json()["id"])

            dipakai.clear()
            await orkes.jalankan_generasi(await kisi("Hukum Newton kedua bidang miring"))
            assert len(dipakai) == 3
            assert set(dipakai) <= {POTONGAN[1], POTONGAN[3], POTONGAN[0]} and POTONGAN[2] not in dipakai, (
                "potongan fotosintesis tidak relevan dengan cakupan fisika"
            )
            assert dipakai[0] == POTONGAN[1], "butir pertama memakai potongan yang paling cocok"

            dipakai.clear()
            await orkes.jalankan_generasi(await kisi(None, jumlah=4))
            assert dipakai == POTONGAN, "tanpa cakupan seluruh potongan dipakai bergiliran"

            dipakai.clear()
            await orkes.jalankan_generasi(await kisi("astronomi galaksi", jumlah=4))
            assert dipakai == POTONGAN, "cakupan tak cocok: seluruh materi dipakai, generasi tidak gagal"
        finally:
            orkes.proses_satu_butir = asli

        prompt: list[str] = []

        async def rekam_llm(peran, system_prompt, user_prompt, **kw):
            prompt.append(system_prompt)
            return {"pertanyaan": "?", "pilihan": {"A": "1", "B": "2", "C": "3", "D": "4"}, "kunci_jawaban": "A"}

        asli_llm = mod_penyusun.panggil_llm
        mod_penyusun.panggil_llm = rekam_llm
        try:
            await mod_penyusun.jalankan("materi", "C3", None, "Hukum Newton {kedua}")
            await mod_penyusun.jalankan("materi", "C3", None, None)
        finally:
            mod_penyusun.panggil_llm = asli_llm
        assert "difokuskan pada cakupan berikut" in prompt[0] and "Hukum Newton {kedua}" in prompt[0]
        assert "cakupan" not in prompt[1].lower(), "tanpa cakupan prompt tidak berubah"

        async with async_session() as db:
            for status in ("diterima", "debating"):
                db.add(ButirSoal(kisi_kisi_id=uuid.UUID(draf_id), status=status, level_bloom="C2"))
            await db.commit()
        item = next(k for k in (await c.get("/api/kisi-kisi", headers=hdr_a)).json() if k["id"] == draf_id)
        assert (item["butir_dibuat"], item["butir_berjalan"]) == (2, 1)
        r = await c.put(f"/api/kisi-kisi/{draf_id}", headers=hdr_a, json=badan())
        assert r.status_code == 409 and "sudah dijalankan" in r.text
        assert (await c.delete(f"/api/kisi-kisi/{draf_id}", headers=hdr_a)).status_code == 409

        r = await c.post("/api/kisi-kisi", headers=hdr_a, json=badan())
        hapus_id = r.json()["id"]
        assert (await c.delete(f"/api/kisi-kisi/{hapus_id}", headers=hdr_b)).status_code == 403
        assert (await c.delete(f"/api/kisi-kisi/{hapus_id}", headers=hdr_a)).status_code == 204
        assert (await c.get(f"/api/kisi-kisi/{hapus_id}", headers=hdr_a)).status_code == 404
        async with async_session() as db:
            from sqlalchemy import select
            sisa = (await db.execute(select(kisi_kisi_materi).where(
                kisi_kisi_materi.c.kisi_kisi_id == uuid.UUID(hapus_id)))).all()
        assert sisa == [], "tautan materi ikut terhapus"

    await engine.dispose()


def test_kisi_kisi():
    uji_cakupan()
    asyncio.run(_jalankan())


if __name__ == "__main__":
    uji_cakupan()
    asyncio.run(_jalankan())
    print("Semua tes kisi-kisi lulus.")
