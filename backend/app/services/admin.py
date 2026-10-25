import logging

from sqlalchemy import func, update
from sqlalchemy.exc import DBAPIError

from app.config import get_settings
from app.database import async_session
from app.models.user import User


def daftar_email_admin() -> set[str]:
    return {e.strip().lower() for e in get_settings().ADMIN_EMAILS.split(",") if e.strip()}


def email_admin(email: str) -> bool:
    return email.strip().lower() in daftar_email_admin()


async def promosikan_admin() -> int:
    emails = daftar_email_admin()
    if not emails:
        return 0
    try:
        async with async_session() as db:
            hasil = await db.execute(
                update(User).where(func.lower(User.email).in_(emails), User.peran != "admin").values(peran="admin")
            )
            await db.commit()
            return hasil.rowcount or 0
    except DBAPIError as e:
        logging.getLogger(__name__).warning("Promosi admin dilewati: %s", str(e.orig)[:120])
        return 0
