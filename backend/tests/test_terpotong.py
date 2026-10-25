import asyncio
import json
import os
import tempfile
from types import SimpleNamespace

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///" + os.path.join(tempfile.mkdtemp(), "uji_terpotong.db")

import httpx

from app.config import get_settings
import app.main
from app.database import Base, engine
from app.services.agents import base
from app.services.agents.base import AgentCallFailed, panggil_llm


def _terpotong():
    return httpx.Response(
        200,
        json={
            "choices": [{"message": {"content": ""}, "finish_reason": "length"}],
            "usage": {"prompt_tokens": 100, "completion_tokens": 600, "total_tokens": 700},
        },
    )


def _sukses():
    return httpx.Response(
        200,
        json={
            "choices": [{"message": {"content": "{\"ok\": true}"}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 100, "completion_tokens": 300, "total_tokens": 400},
        },
    )


async def _jalankan():
    s = get_settings()
    s.GROQ_API_KEY, s.SAMBANOVA_API_KEY = "k-groq", "k-samba"
    s.PROVIDER_PRIMER, s.PROVIDER_SEKUNDER = "groq", "sambanova"

    async def tidur(_):
        return None

    base.asyncio = SimpleNamespace(sleep=tidur)

    batas_dikirim: list[int] = []
    antrean: list = []

    def server(request: httpx.Request):
        batas_dikirim.append(json.loads(request.content)["max_tokens"])
        return antrean.pop(0) if len(antrean) > 1 else antrean[0]

    base._buat_client = lambda timeout: httpx.AsyncClient(transport=httpx.MockTransport(server))

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    antrean[:] = [_terpotong(), _terpotong(), _sukses()]
    hasil = await panggil_llm("kritikus", "sistem", "pengguna", max_tokens=600)
    assert hasil == {"ok": True}
    assert batas_dikirim == [600, 1200, 2400], batas_dikirim

    batas_dikirim.clear()
    antrean[:] = [_terpotong()]
    try:
        await panggil_llm("kritikus", "sistem", "pengguna", max_tokens=6000, max_retries=3)
        raise AssertionError("seharusnya gagal")
    except AgentCallFailed as e:
        assert "terpotong" in str(e), str(e)
    assert batas_dikirim == [6000, 12000, 24000, 24000], batas_dikirim

    await engine.dispose()
    print("Semua tes terpotong lulus.")


asyncio.run(_jalankan())
