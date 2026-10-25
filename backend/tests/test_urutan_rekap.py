import asyncio
import os
import tempfile
import uuid
from datetime import datetime, timedelta, timezone

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///" + os.path.join(tempfile.mkdtemp(), "uji_urutan.db")

import httpx

from app.database import Base, async_session, engine
from app.main import app
from app.models.log_llm import LogLLM


async def _jalankan():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://uji") as c:
        r = await c.post("/api/auth/register", json={"nama": "G", "email": "g@example.com", "password": "rahasia123"})
        hdr = {"Authorization": f"Bearer {r.json()['access_token']}"}
        guru = uuid.UUID(r.json()["user"]["id"])
        sekarang = datetime.now(timezone.utc)

        async def catat(provider, model, peran, menit_lalu):
            async with async_session() as db:
                db.add(LogLLM(guru_id=guru, peran=peran, kelompok="primer", provider=provider, model=model,
                              status="sukses", percobaan_panggilan=1, token_total=10,
                              waktu=sekarang - timedelta(minutes=menit_lalu)))
                await db.commit()

        await catat("bankai", "glm", "kritikus", 60)
        await catat("bankai", "glm", "penjawab_buta", 59)
        await catat("vpsmurah", "opus-5", "penjawab_buta", 5)
        await catat("vpsmurah", "opus-5", "kritikus", 6)
        await catat("vpsmurah", "fable-51", "arbiter", 2)
        await catat("vpsmurah", "fable-51", "penyusun", 4)

        rk = (await c.get("/api/log-llm/ringkasan", headers=hdr)).json()
        urutan = [(x["model"], x["peran"]) for x in rk["rincian"]]
        assert urutan == [
            ("fable-51", "penyusun"), ("fable-51", "arbiter"),
            ("opus-5", "kritikus"), ("opus-5", "penjawab_buta"),
            ("glm", "kritikus"), ("glm", "penjawab_buta"),
        ], urutan
    await engine.dispose()
    print("Semua tes urutan rekap lulus.")


asyncio.run(_jalankan())
