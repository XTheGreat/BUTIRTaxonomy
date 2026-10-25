import asyncio
import os
import tempfile

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_admin.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"
os.environ["ADMIN_EMAILS"] = "Bos@Example.com, lain@example.com"

import httpx
from sqlalchemy import select

from app.database import Base, async_session, engine
from app.main import app
from app.models.user import User
from app.services.admin import promosikan_admin


async def _jalankan():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://uji") as c:
        async def daftar(nama, email):
            r = await c.post("/api/auth/register", json={"nama": nama, "email": email, "password": "rahasia123"})
            assert r.status_code == 201, r.text
            return {"Authorization": f"Bearer {r.json()['access_token']}"}, r.json()["user"]

        hdr_guru, guru = await daftar("Guru", "guru@example.com")
        hdr_admin, admin = await daftar("Bos", "bos@example.com")
        assert guru["peran"] == "guru" and admin["peran"] == "admin", (guru, admin)

        r = await c.get("/api/log-llm/ringkasan", headers=hdr_guru)
        assert r.status_code == 200 and r.json()["admin"] is False
        assert r.json()["penugasan"] == [] and r.json()["peringatan"] == []

        r = await c.get("/api/log-llm/ringkasan", headers=hdr_admin)
        assert r.json()["admin"] is True and len(r.json()["penugasan"]) == 4

    async with async_session() as db:
        db.add(User(nama="Lain", email="LAIN@example.com", password_hash="x"))
        await db.commit()
    assert await promosikan_admin() == 1
    assert await promosikan_admin() == 0
    async with async_session() as db:
        hasil = (await db.execute(select(User.email, User.peran))).all()
    assert dict(hasil)["LAIN@example.com"] == "admin" and dict(hasil)["guru@example.com"] == "guru"

    await engine.dispose()
    print("Semua tes peran admin lulus.")


asyncio.run(_jalankan())
