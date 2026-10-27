import uuid
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.galat import Galat
from app.database import get_db
from app.core.security import decode_access_token, hash_token
from app.models.token_dicabut import TokenDicabut
from app.models.user import User

bearer_scheme = HTTPBearer()


async def get_current_guru(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise Galat(401, "token_tidak_valid", "Token tidak valid atau kedaluwarsa")
    user_id = payload.get("sub")
    if user_id is None or payload.get("type") == "reset":
        raise Galat(401, "token_tidak_valid", "Token tidak valid")
    sudah_logout = await db.execute(
        select(TokenDicabut.token_hash).where(
            TokenDicabut.token_hash == hash_token(credentials.credentials)
        )
    )
    if sudah_logout.first():
        raise Galat(401, "sesi_berakhir", "Sesi telah berakhir, silakan masuk kembali")
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise Galat(401, "pengguna_tidak_ditemukan", "User tidak ditemukan")
    return user


async def get_current_admin(user: User = Depends(get_current_guru)) -> User:
    if user.peran != "admin":
        raise Galat(403, "hanya_admin", "Hanya admin yang dapat mengakses ini")
    return user
