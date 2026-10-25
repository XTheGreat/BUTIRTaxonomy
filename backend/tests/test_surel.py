import asyncio
import json

import httpx

import app.services.surel as surel
from app.config import get_settings

permintaan: list[httpx.Request] = []
tanggapan = {"status": 200}


def penanganan(request: httpx.Request) -> httpx.Response:
    permintaan.append(request)
    return httpx.Response(tanggapan["status"], json={"Messages": [{"Status": "success"}]})


async def _jalankan():
    s = get_settings()
    asli = (s.MAILJET_API_KEY, s.MAILJET_SECRET_KEY, s.MAILJET_FROM, s.SMTP_HOST, surel.httpx.AsyncClient, surel._kirim_sinkron, s.RESEND_API_KEY, s.RESEND_FROM)
    klien_asli = surel.httpx.AsyncClient
    smtp_terpanggil: list[int] = []
    try:
        s.MAILJET_API_KEY = s.MAILJET_SECRET_KEY = s.MAILJET_FROM = s.SMTP_HOST = s.RESEND_API_KEY = ""
        assert not surel.surel_terkonfigurasi()
        assert await surel.kirim_email_kode("a@b.com", "123456", 10) is False, "tanpa konfigurasi hanya dicetak ke log"

        s.MAILJET_API_KEY, s.MAILJET_SECRET_KEY, s.MAILJET_FROM = "kunci", "rahasia", "pengirim@example.com"
        surel.httpx.AsyncClient = lambda **kw: klien_asli(transport=httpx.MockTransport(penanganan), **kw)
        surel._kirim_sinkron = lambda pesan: smtp_terpanggil.append(1)

        assert await surel.kirim_email_kode("mhs@student.ik.ac.id", "654321", 10) is True
        r = permintaan[-1]
        assert str(r.url) == surel.URL_MAILJET and r.headers["authorization"].startswith("Basic ")
        pesan = json.loads(r.content)["Messages"][0]
        assert pesan["From"]["Email"] == "pengirim@example.com" and pesan["To"][0]["Email"] == "mhs@student.ik.ac.id"
        assert "654321" in pesan["Subject"] and "654321" in pesan["TextPart"]

        assert await surel.kirim_email_reset("a@b.com", "http://x/reset?token=t", 30) is True
        assert "http://x/reset?token=t" in json.loads(permintaan[-1].content)["Messages"][0]["TextPart"]
        assert smtp_terpanggil == [], "SMTP tidak dipakai bila Mailjet terisi"

        tanggapan["status"] = 401
        assert await surel.kirim_email_kode("a@b.com", "111111", 10) is False, "penolakan Mailjet dilaporkan, tidak melempar galat"

        tanggapan["status"] = 200
        s.RESEND_API_KEY, s.RESEND_FROM = "re_kunci", "BUTIR <butir@example.com>"
        assert await surel.kirim_email_kode("mhs@student.ik.ac.id", "333333", 10) is True
        r = permintaan[-1]
        assert str(r.url) == surel.URL_RESEND and r.headers["authorization"] == "Bearer re_kunci"
        isi = json.loads(r.content)
        assert isi["from"] == "BUTIR <butir@example.com>" and isi["to"] == ["mhs@student.ik.ac.id"] and "333333" in isi["text"]
        tanggapan["status"] = 403
        assert await surel.kirim_email_kode("a@b.com", "444444", 10) is False
        tanggapan["status"] = 200
        s.RESEND_API_KEY = s.RESEND_FROM = ""
        s.MAILJET_API_KEY = s.MAILJET_SECRET_KEY = ""
        s.SMTP_HOST = "smtp.example.com"
        assert await surel.kirim_email_kode("a@b.com", "222222", 10) is True
        assert smtp_terpanggil == [1], "tanpa Mailjet kembali ke SMTP"
    finally:
        s.MAILJET_API_KEY, s.MAILJET_SECRET_KEY, s.MAILJET_FROM, s.SMTP_HOST, _, surel._kirim_sinkron, s.RESEND_API_KEY, s.RESEND_FROM = asli
        surel.httpx.AsyncClient = klien_asli


def test_surel():
    asyncio.run(_jalankan())


if __name__ == "__main__":
    asyncio.run(_jalankan())
    print("Semua tes surel lulus.")
