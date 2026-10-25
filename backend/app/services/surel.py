import asyncio
import logging
import smtplib
from email.message import EmailMessage

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

URL_MAILJET = "https://api.mailjet.com/v3.1/send"
URL_RESEND = "https://api.resend.com/emails"


def resend_terkonfigurasi() -> bool:
    return bool(get_settings().RESEND_API_KEY)


def mailjet_terkonfigurasi() -> bool:
    s = get_settings()
    return bool(s.MAILJET_API_KEY and s.MAILJET_SECRET_KEY)


def smtp_terkonfigurasi() -> bool:
    return bool(get_settings().SMTP_HOST)


def surel_terkonfigurasi() -> bool:
    return resend_terkonfigurasi() or mailjet_terkonfigurasi() or smtp_terkonfigurasi()


def _pengirim() -> str:
    s = get_settings()
    return s.MAILJET_FROM or s.SMTP_FROM or s.SMTP_USER


def _kirim_sinkron(pesan: EmailMessage) -> None:
    s = get_settings()
    if s.SMTP_USE_SSL:
        server = smtplib.SMTP_SSL(s.SMTP_HOST, s.SMTP_PORT, timeout=20)
    else:
        server = smtplib.SMTP(s.SMTP_HOST, s.SMTP_PORT, timeout=20)
    with server:
        if s.SMTP_USE_TLS and not s.SMTP_USE_SSL:
            server.starttls()
        if s.SMTP_USER:
            server.login(s.SMTP_USER, s.SMTP_PASSWORD)
        server.send_message(pesan)


async def _kirim_resend(tujuan: str, subjek: str, isi: str) -> None:
    s = get_settings()
    pengirim = s.RESEND_FROM or "BUTIR <onboarding@resend.dev>"
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(
            URL_RESEND,
            json={"from": pengirim, "to": [tujuan], "subject": subjek, "text": isi},
            headers={"Authorization": f"Bearer {s.RESEND_API_KEY}"},
        )
    if r.status_code not in (200, 201):
        raise RuntimeError(f"Resend menolak pengiriman (HTTP {r.status_code}): {r.text[:300]}")


async def _kirim_mailjet(tujuan: str, subjek: str, isi: str) -> None:
    s = get_settings()
    muatan = {
        "Messages": [
            {
                "From": {"Email": _pengirim(), "Name": "BUTIR"},
                "To": [{"Email": tujuan}],
                "Subject": subjek,
                "TextPart": isi,
            }
        ]
    }
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(URL_MAILJET, json=muatan, auth=(s.MAILJET_API_KEY, s.MAILJET_SECRET_KEY))
    if r.status_code != 200:
        raise RuntimeError(f"Mailjet menolak pengiriman (HTTP {r.status_code}): {r.text[:300]}")


async def _kirim(tujuan: str, subjek: str, isi: str) -> None:
    if resend_terkonfigurasi():
        await _kirim_resend(tujuan, subjek, isi)
        return
    if mailjet_terkonfigurasi():
        await _kirim_mailjet(tujuan, subjek, isi)
        return
    pesan = EmailMessage()
    pesan["Subject"] = subjek
    pesan["From"] = _pengirim()
    pesan["To"] = tujuan
    pesan.set_content(isi)
    await asyncio.to_thread(_kirim_sinkron, pesan)


async def kirim_email_reset(tujuan: str, tautan: str, menit_berlaku: int) -> bool:
    if not surel_terkonfigurasi():
        logger.warning("[RESET PASSWORD] Pengiriman email belum diatur. Tautan reset untuk %s: %s", tujuan, tautan)
        print(f"[RESET PASSWORD] Tautan untuk {tujuan}: {tautan}")
        return False

    isi = (
        "Halo,\n\n"
        "Kami menerima permintaan untuk mengatur ulang kata sandi akun BUTIR Anda.\n"
        f"Buka tautan berikut dalam {menit_berlaku} menit untuk membuat kata sandi baru:\n\n"
        f"{tautan}\n\n"
        "Tautan hanya bisa dipakai sekali. Jika Anda tidak memintanya, abaikan email ini; "
        "kata sandi Anda tidak berubah.\n"
    )
    try:
        await _kirim(tujuan, "Atur ulang kata sandi BUTIR", isi)
        return True
    except Exception as e:
        logger.error("Gagal mengirim email reset ke %s: %s", tujuan, e)
        return False


async def kirim_email_kode(tujuan: str, kode: str, menit_berlaku: int) -> bool:
    if not surel_terkonfigurasi():
        logger.warning("[KODE MASUK] Pengiriman email belum diatur. Kode untuk %s: %s", tujuan, kode)
        print(f"[KODE MASUK] Kode untuk {tujuan}: {kode}")
        return False

    isi = (
        "Halo,\n\n"
        f"Kode masuk BUTIR Anda: {kode}\n\n"
        f"Kode berlaku {menit_berlaku} menit dan hanya bisa dipakai sekali. "
        "Jika Anda tidak memintanya, abaikan email ini.\n"
    )
    try:
        await _kirim(tujuan, f"Kode masuk BUTIR: {kode}", isi)
        return True
    except Exception as e:
        logger.error("Gagal mengirim kode masuk ke %s: %s", tujuan, e)
        return False
