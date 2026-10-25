import asyncio
import io
import os
import tempfile
import uuid
from urllib.parse import parse_qs, urlparse

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_akun.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"

import httpx
from docx import Document
from pypdf import PdfReader

import app.routers.auth as auth_router
import app.services.surel as surel
from app.config import get_settings
from app.core.security import create_access_token
from app.database import Base, async_session, engine
from app.main import app
from app.models.butir_soal import ButirSoal
from app.models.materi import Materi
from app.services.export_dokumen import latex_ke_teks


def _teks_docx(isi: bytes) -> str:
    return "\n".join(p.text for p in Document(io.BytesIO(isi)).paragraphs)


def _teks_pdf(isi: bytes) -> str:
    return "\n".join(p.extract_text() or "" for p in PdfReader(io.BytesIO(isi)).pages)


async def _jalankan():
    assert latex_ke_teks(r"\(x^2 + \frac{a}{b}\)") == "x² + (a)/(b)"
    assert latex_ke_teks(r"\(\ce{Pb^2+(aq) + 2I^-(aq) -> PbI2(s)}\)") == "Pb²⁺(aq) + 2I⁻(aq) → PbI2(s)"
    assert latex_ke_teks(r"\(\Delta H \leq 0\)") == "ΔH ≤ 0"
    assert latex_ke_teks(None) == ""

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    surel_terkirim: list[tuple[str, str, int]] = []

    async def surel_palsu(tujuan, tautan, menit):
        surel_terkirim.append((tujuan, tautan, menit))
        return True

    auth_router.kirim_email_reset = surel_palsu

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://uji") as c:
        r = await c.post(
            "/api/auth/register",
            json={"nama": "Ani", "email": "ani@example.com", "password": "rahasia123"},
        )
        token1 = r.json()["access_token"]
        id_ani = r.json()["user"]["id"]
        hdr1 = {"Authorization": f"Bearer {token1}"}
        login2 = await c.post("/api/auth/login", json={"email": "ani@example.com", "password": "rahasia123"})
        hdr2 = {"Authorization": f"Bearer {login2.json()['access_token']}"}

        assert (await c.get("/api/bank-soal", headers=hdr1)).status_code == 200
        assert (await c.post("/api/auth/logout", headers=hdr1)).status_code == 200
        r = await c.get("/api/bank-soal", headers=hdr1)
        assert r.status_code == 401, "token yang sudah logout harus ditolak"
        assert (await c.get("/api/bank-soal", headers=hdr2)).status_code == 200, "sesi lain tidak ikut keluar"
        assert (await c.post("/api/auth/logout", headers=hdr1)).status_code == 200, "logout ulang tidak error"
        assert (await c.post("/api/auth/logout")).status_code == 200, "logout tanpa token tidak error"
        assert (
            await c.post("/api/auth/logout", headers={"Authorization": "Bearer sampah"})
        ).status_code == 200

        assert (await c.post("/api/auth/forgot-password", json={"email": "tidak@ada.com"})).status_code == 200
        assert surel_terkirim == [], "email tak terdaftar tidak boleh dikirimi apa pun"

        r = await c.post("/api/auth/forgot-password", json={"email": "ani@example.com"})
        assert r.status_code == 200
        assert len(surel_terkirim) == 1
        tujuan, tautan, menit = surel_terkirim[0]
        assert tujuan == "ani@example.com" and menit == get_settings().RESET_TOKEN_EXPIRE_MINUTES
        assert urlparse(tautan).path == "/reset-password"
        token_reset = parse_qs(urlparse(tautan).query)["token"][0]

        r = await c.get("/api/bank-soal", headers={"Authorization": f"Bearer {token_reset}"})
        assert r.status_code == 401, "token reset tidak boleh dipakai sebagai token sesi"

        r = await c.post("/api/auth/reset-password", json={"token": token_reset, "new_password": "lemah"})
        assert r.status_code == 422
        r = await c.post("/api/auth/reset-password", json={"token": token_reset, "new_password": "baru12345"})
        assert r.status_code == 200, r.text
        r = await c.post("/api/auth/reset-password", json={"token": token_reset, "new_password": "lain12345"})
        assert r.status_code == 400, "token reset hanya boleh dipakai sekali"
        assert (await c.post("/api/auth/login", json={"email": "ani@example.com", "password": "baru12345"})).status_code == 200
        assert (await c.post("/api/auth/login", json={"email": "ani@example.com", "password": "rahasia123"})).status_code == 401

        kedaluwarsa = create_access_token({"sub": id_ani, "type": "reset", "ph": "x"}, expire_minutes=-1)
        r = await c.post("/api/auth/reset-password", json={"token": kedaluwarsa, "new_password": "baru12345"})
        assert r.status_code == 400
        biasa = create_access_token({"sub": id_ani})
        r = await c.post("/api/auth/reset-password", json={"token": biasa, "new_password": "baru12345"})
        assert r.status_code == 400, "token sesi biasa tidak boleh dipakai untuk reset"

        auth_router.kirim_email_reset = surel.kirim_email_reset
        s = get_settings()
        s.SMTP_HOST = s.MAILJET_API_KEY = s.MAILJET_SECRET_KEY = s.MAILJET_FROM = s.RESEND_API_KEY = ""
        assert await surel.kirim_email_reset("a@b.com", "http://x", 30) is False

        pesan_terkirim = []
        surel._kirim_sinkron = lambda pesan: pesan_terkirim.append(pesan)
        s.SMTP_HOST, s.SMTP_FROM = "smtp.palsu", "butir@example.com"
        assert await surel.kirim_email_reset("guru@example.com", "http://x/reset?token=abc", 30) is True
        p = pesan_terkirim[0]
        assert p["To"] == "guru@example.com" and p["From"] == "butir@example.com"
        assert "http://x/reset?token=abc" in p.get_content() and "30 menit" in p.get_content()

        def gagal(_):
            raise OSError("SMTP mati")

        surel._kirim_sinkron = gagal
        assert await surel.kirim_email_reset("guru@example.com", "http://x", 30) is False, "tidak boleh melempar"
        s.SMTP_HOST = ""

        def daftar(nama):
            return c.post(
                "/api/auth/register",
                json={"nama": nama, "email": f"{nama.lower()}@example.com", "password": "rahasia123"},
            )

        ra = await daftar("GuruA")
        rb = await daftar("GuruB")
        hdr_a = {"Authorization": f"Bearer {ra.json()['access_token']}"}
        hdr_b = {"Authorization": f"Bearer {rb.json()['access_token']}"}

        async with async_session() as db:
            materi = Materi(guru_id=uuid.UUID(ra.json()["user"]["id"]), judul="M", file_path="x")
            db.add(materi)
            await db.commit()
            materi_id = str(materi.id)
        kk = await c.post(
            "/api/kisi-kisi",
            headers=hdr_a,
            json={"jumlah_butir": 2, "distribusi_bloom": {"C1": 100}, "materi_ids": [materi_id]},
        )
        async with async_session() as db:
            ids = []
            for i, (q, k) in enumerate([(r"Hitung \(x^2\) saat x=3", "B"), ("Ibu kota Indonesia?", "A")]):
                b = ButirSoal(
                    kisi_kisi_id=uuid.UUID(kk.json()["id"]),
                    status="diterima",
                    pertanyaan=q,
                    pilihan={"A": "Jakarta", "B": "9", "C": "6", "D": "3"},
                    kunci_jawaban=k,
                    pembahasan=f"Penjelasan nomor {i + 1}",
                    level_bloom="C1",
                    bobot_poin=2,
                )
                db.add(b)
                await db.flush()
                ids.append(str(b.id))
            await db.commit()

        r = await c.get("/api/bank-soal/export?format=pdf", headers=hdr_a)
        assert r.status_code == 200 and r.content[:4] == b"%PDF"
        assert r.headers["content-type"] == "application/pdf"
        assert "bank_soal.pdf" in r.headers["content-disposition"]
        teks = _teks_pdf(r.content)
        assert "Ibu kota Indonesia?" in teks and "Kunci: B" in teks and "Penjelasan nomor 1" in teks

        r = await c.get("/api/bank-soal/export?format=docx&kunci=false", headers=hdr_a)
        assert r.status_code == 200 and r.content[:2] == b"PK"
        teks = _teks_docx(r.content)
        assert "Ibu kota Indonesia?" in teks and "x²" in teks, "rumus harus dikonversi, bukan LaTeX mentah"
        assert "\\(" not in teks and "Kunci" not in teks and "Penjelasan" not in teks

        assert "Kunci: B" in _teks_docx((await c.get("/api/bank-soal/export?format=docx", headers=hdr_a)).content)
        assert (await c.get("/api/bank-soal/export?format=xls", headers=hdr_a)).status_code == 400
        kosong = await c.get("/api/bank-soal/export?format=docx", headers=hdr_b)
        assert "Tidak ada butir soal" in _teks_docx(kosong.content) and "Ibu kota" not in _teks_docx(kosong.content)

        u = await c.post(
            "/api/ujian", headers=hdr_a, json={"judul": "UTS Fisika: Bab 1/2", "butir_ids": ids, "durasi_menit": 45}
        )
        uid = u.json()["id"]
        r = await c.get(f"/api/ujian/{uid}/export?format=pdf", headers=hdr_a)
        assert r.status_code == 200 and r.content[:4] == b"%PDF"
        assert 'filename="UTS_Fisika_Bab_1_2.pdf"' in r.headers["content-disposition"]
        lembar = _teks_pdf(r.content)
        assert "Ibu kota Indonesia?" in lembar and "Kunci:" not in lembar, "lembar siswa tanpa kunci"
        assert "45 menit" in lembar

        r = await c.get(f"/api/ujian/{uid}/export?format=docx&kunci=true", headers=hdr_a)
        assert "Kunci: A" in _teks_docx(r.content)
        assert 'filename="UTS_Fisika_Bab_1_2_kunci.docx"' in r.headers["content-disposition"]

        assert (await c.get(f"/api/ujian/{uid}/export?format=pdf", headers=hdr_b)).status_code == 403
        assert (await c.get(f"/api/ujian/{uid}/export?format=odt", headers=hdr_a)).status_code == 400
        assert (await c.get(f"/api/ujian/{uuid.uuid4()}/export", headers=hdr_a)).status_code == 404
        assert (await c.get(f"/api/ujian/{uid}/export")).status_code in (401, 403)

    await engine.dispose()
    print("Semua tes akun dan ekspor lulus.")


def test_akun_ekspor():
    asyncio.run(_jalankan())


if __name__ == "__main__":
    asyncio.run(_jalankan())
