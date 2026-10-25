import asyncio
import io
import os
import tempfile
import uuid
import zipfile

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_fitur.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"

import httpx

from app.database import Base, async_session, engine
from app.main import app
from app.models.butir_soal import ButirSoal
from app.models.kisi_kisi import KisiKisi
from app.models.materi import Materi
from app.services.exam_assembly import hitung_target_per_level

UPLOAD_DIR = "uploads"


def _docx(paragraf: list[tuple[str, str | None]]) -> bytes:
    ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    isi = ""
    for teks, gaya in paragraf:
        ppr = f'<w:pPr><w:pStyle w:val="{gaya}"/></w:pPr>' if gaya else ""
        isi += f"<w:p>{ppr}<w:r><w:t>{teks}</w:t></w:r></w:p>"
    xml = f'<?xml version="1.0"?><w:document xmlns:w="{ns}"><w:body>{isi}</w:body></w:document>'
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("word/document.xml", xml)
    return buf.getvalue()


async def _daftar(c: httpx.AsyncClient, nama: str):
    r = await c.post(
        "/api/auth/register",
        json={"nama": nama, "email": f"{nama.lower()}@example.com", "password": "rahasia123"},
    )
    assert r.status_code == 201, r.text
    d = r.json()
    return {"Authorization": f"Bearer {d['access_token']}"}, d["user"]["id"]


async def _jalankan():
    assert sum(hitung_target_per_level(10, {"C1": 33, "C2": 33, "C3": 34}).values()) == 10
    assert hitung_target_per_level(10, {"C4": 100}) == {"C4": 10}

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    sebelum = set(os.listdir(UPLOAD_DIR)) if os.path.isdir(UPLOAD_DIR) else set()

    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://uji") as c:
            for lemah in ("pendek1", "hanyahuruf", "12345678"):
                r = await c.post(
                    "/api/auth/register",
                    json={"nama": "X", "email": "x@example.com", "password": lemah},
                )
                assert r.status_code == 422, f"{lemah!r} seharusnya ditolak"
            assert "Kata sandi" in r.json()["detail"][0]["msg"]

            hdr_a, id_a = await _daftar(c, "GuruA")
            hdr_b, _ = await _daftar(c, "GuruB")

            def kirim(nama: str, isi: bytes, hdr=hdr_a):
                return c.post(
                    "/api/materi", headers=hdr, data={"judul": nama}, files={"file": (nama, isi)}
                )

            assert (await kirim("virus.exe", b"MZ")).status_code == 400
            assert (await kirim("rusak.docx", b"bukan zip")).status_code == 400
            assert (await kirim("kosong.docx", _docx([("", None)]))).status_code == 400
            assert (await kirim("besar.txt", b"a" * (10 * 1024 * 1024 + 1))).status_code == 413

            isi_docx = _docx(
                [
                    ("Bab 1 Ekosistem", "Heading1"),
                    ("Ekosistem adalah hubungan timbal balik antara makhluk hidup dan lingkungannya.", None),
                    ("Produsen membuat makanan sendiri melalui fotosintesis.", None),
                ]
            )
            r = await kirim("../../ekosistem.docx", isi_docx)
            assert r.status_code == 201, r.text
            materi_id = r.json()["id"]
            n = await c.get(f"/api/materi/{materi_id}/chunks-count", headers=hdr_a)
            assert n.json()["count"] >= 1
            baru = set(os.listdir(UPLOAD_DIR)) - sebelum
            assert baru and all(".." not in f and "/" not in f for f in baru)
            assert not os.path.exists("ekosistem.docx")

            kk = await c.post(
                "/api/kisi-kisi",
                headers=hdr_a,
                json={"jumlah_butir": 1, "distribusi_bloom": {"C1": 100}, "materi_ids": [materi_id]},
            )
            kk_id = uuid.UUID(kk.json()["id"])

            async def butir(level: str, status: str = "diterima", **kw) -> str:
                async with async_session() as db:
                    b = ButirSoal(
                        kisi_kisi_id=kk_id,
                        status=status,
                        pertanyaan=kw.get("pertanyaan", f"Soal {level}"),
                        pilihan=kw.get("pilihan", {"A": "a", "B": "b", "C": "c", "D": "d"}),
                        kunci_jawaban=kw.get("kunci", "A"),
                        level_bloom=level,
                        bobot_poin=kw.get("bobot", 2),
                    )
                    db.add(b)
                    await db.commit()
                    return str(b.id)

            for lv in ("C1", "C1", "C3", "C3", "C3", "C4"):
                await butir(lv)

            r = await c.post(
                "/api/ujian/rakit-otomatis",
                headers=hdr_a,
                json={"jumlah_butir": 4, "distribusi_bloom": {"C3": 50, "C4": 50}},
            )
            assert r.status_code == 200, r.text
            h = r.json()
            assert len(h["butir_ids"]) == 4 and h["kurang_total"] == 0
            assert h["per_level"]["C3"] == 2 and h["per_level"]["C4"] == 1
            assert sum(h["per_level"].values()) == 4
            assert h["kekurangan"] == {"C4": 1}, "C4 kurang satu dan harus dilaporkan"
            assert h["total_bobot"] == 8

            r = await c.post(
                "/api/ujian/rakit-otomatis",
                headers=hdr_a,
                json={"jumlah_butir": 10, "distribusi_bloom": {"C1": 100}},
            )
            assert r.json()["kurang_total"] == 4 and len(r.json()["butir_ids"]) == 6

            for salah in (
                {"jumlah_butir": 4, "distribusi_bloom": {"C3": 60}},
                {"jumlah_butir": 4, "distribusi_bloom": {"C9": 100}},
                {"jumlah_butir": 0, "distribusi_bloom": {"C3": 100}},
            ):
                r = await c.post("/api/ujian/rakit-otomatis", headers=hdr_a, json=salah)
                assert r.status_code == 422, salah

            r = await c.post(
                "/api/ujian/rakit-otomatis",
                headers=hdr_b,
                json={"jumlah_butir": 3, "distribusi_bloom": {"C3": 100}},
            )
            assert r.json()["butir_ids"] == []

            bid = await butir("C2", pertanyaan="Lama")
            r = await c.patch(
                f"/api/butir/{bid}",
                headers=hdr_a,
                json={
                    "pertanyaan": "Baru \\(x^2\\)",
                    "pilihan": {"A": "1", "B": "2", "C": "3", "D": "4"},
                    "kunci_jawaban": "C",
                    "level_bloom": "C3",
                    "bobot_poin": 3,
                },
            )
            assert r.status_code == 200, r.text
            assert r.json()["kunci_jawaban"] == "C" and r.json()["bobot_poin"] == 3

            for salah in (
                {"kunci_jawaban": "E"},
                {"level_bloom": "C7"},
                {"bobot_poin": 0},
                {"status": "tertunda"},
                {"pertanyaan": "  "},
                {"pilihan": {"A": "1", "B": "2"}},
            ):
                r = await c.patch(f"/api/butir/{bid}", headers=hdr_a, json=salah)
                assert r.status_code == 422, salah

            assert (await c.patch(f"/api/butir/{bid}", headers=hdr_b, json={"bobot_poin": 5})).status_code == 403

            sedang = await butir("C1", status="debating")
            assert (await c.patch(f"/api/butir/{sedang}", headers=hdr_a, json={"bobot_poin": 5})).status_code == 409

            kosong = await butir("C1", status="ditandai", pertanyaan="", pilihan={}, kunci="")
            r = await c.patch(f"/api/butir/{kosong}", headers=hdr_a, json={"status": "diterima"})
            assert r.status_code == 400, "butir kosong tidak boleh diterima ke bank"
            r = await c.patch(
                f"/api/butir/{kosong}",
                headers=hdr_a,
                json={
                    "pertanyaan": "Lengkap?",
                    "pilihan": {"A": "1", "B": "2", "C": "3", "D": "4"},
                    "kunci_jawaban": "B",
                    "status": "diterima",
                },
            )
            assert r.status_code == 200 and r.json()["status"] == "diterima"

            u = await c.post(
                "/api/ujian", headers=hdr_a, json={"judul": "U", "butir_ids": [bid]}
            )
            lap = (await c.get(f"/api/ujian/{u.json()['id']}/laporan", headers=hdr_a)).json()
            assert lap["daya_beda_dihitung"] is False and lap["daya_beda_indikatif"] is True
    finally:
        if os.path.isdir(UPLOAD_DIR):
            for f in set(os.listdir(UPLOAD_DIR)) - sebelum:
                os.remove(os.path.join(UPLOAD_DIR, f))
        await engine.dispose()

    print("Semua tes fitur lulus.")


def test_fitur():
    asyncio.run(_jalankan())


if __name__ == "__main__":
    asyncio.run(_jalankan())
