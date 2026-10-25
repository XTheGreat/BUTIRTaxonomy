import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

URL_TOKENINFO = "https://oauth2.googleapis.com/tokeninfo"
PENERBIT_SAH = ("accounts.google.com", "https://accounts.google.com")


async def verifikasi_token_google(credential: str) -> dict | None:
    client_id = get_settings().GOOGLE_CLIENT_ID
    if not client_id or not credential:
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(URL_TOKENINFO, params={"id_token": credential})
    except httpx.HTTPError as e:
        logger.error("Gagal menghubungi Google untuk verifikasi token: %s", e)
        return None
    if r.status_code != 200:
        return None
    klaim = r.json()
    if klaim.get("aud") != client_id or klaim.get("iss") not in PENERBIT_SAH:
        return None
    if str(klaim.get("email_verified")).lower() != "true" or not klaim.get("email"):
        return None
    return {"email": klaim["email"], "nama": klaim.get("name") or ""}
