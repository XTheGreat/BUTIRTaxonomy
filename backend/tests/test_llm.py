import asyncio
import json
import os
import tempfile
from types import SimpleNamespace

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_llm.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"
os.environ["ADMIN_EMAILS"] = "gurua@example.com"

import httpx
from sqlalchemy import delete, select

import app.services.agents.base as base
from app.config import get_settings
from app.database import Base, async_session, engine
from app.main import app
from app.models.log_llm import LogLLM
from app.services.agents import kritikus, penyusun
from app.services.agents.base import AgentCallFailed, konteks_llm, panggil_llm
from app.services.agents.penyedia import (
    PenyediaTidakTersedia,
    periksa_konfigurasi,
    pilih_penyedia,
)

KUNCI_GROQ = "kunci-groq-RAHASIA-123"
KUNCI_SAMBA = "kunci-samba-RAHASIA-456"
KUNCI_BANKAI = "kunci-bankai-RAHASIA-789"
KUNCI_BANKAI_PRIMER = "kunci-bankai-primer-RAHASIA-000"
KUNCI_ADVANCE = "kunci-advance-RAHASIA-111"
PROMPT_RAHASIA = "isi-prompt-yang-tidak-boleh-disimpan"


def _jawaban(isi="{\"ok\": true}", token=(11, 7, 18)):
    return httpx.Response(
        200,
        json={
            "choices": [{"message": {"content": isi}}],
            "usage": {"prompt_tokens": token[0], "completion_tokens": token[1], "total_tokens": token[2]},
        },
    )


class ServerPalsu:
    def __init__(self):
        self.permintaan: list[dict] = []
        self.antrean: dict[str, list] = {}

    def atur(self, host: str, *respons):
        self.antrean[host] = list(respons)

    def __call__(self, request: httpx.Request):
        host = request.url.host
        body = json.loads(request.content)
        self.permintaan.append(
            {"host": host, "path": request.url.path, "model": body["model"], "auth": request.headers["authorization"]}
        )
        antre = self.antrean.get(host, [])
        item = antre.pop(0) if len(antre) > 1 else (antre[0] if antre else _jawaban())
        if isinstance(item, Exception):
            raise item
        return item


async def _baris_log():
    async with async_session() as db:
        return (await db.execute(select(LogLLM).order_by(LogLLM.waktu, LogLLM.percobaan_panggilan))).scalars().all()


async def _kosongkan_log():
    async with async_session() as db:
        await db.execute(delete(LogLLM))
        await db.commit()


async def _jalankan():
    s = get_settings()
    asli = {k: getattr(s, k) for k in (
        "GROQ_API_KEY", "SAMBANOVA_API_KEY", "BANKAI_API_KEY", "BANKAI_API_KEY_PRIMER", "BANKAI_BASE_URL",
        "ADVANCE_API_KEY", "ADVANCE_BASE_URL", "ADVANCE_MODEL_PENYUSUN", "ADVANCE_MODEL_KRITIKUS",
        "ADVANCE_MODEL_PENJAWAB_BUTA", "ADVANCE_MODEL_ARBITER",
        "BANKAI_MODEL_PENYUSUN", "BANKAI_MODEL_KRITIKUS", "BANKAI_MODEL_PENJAWAB_BUTA", "BANKAI_MODEL_ARBITER",
        "PROVIDER_PRIMER", "PROVIDER_SEKUNDER", "STRICT_DUA_PENYEDIA",
    )}
    s.GROQ_API_KEY, s.SAMBANOVA_API_KEY = KUNCI_GROQ, KUNCI_SAMBA
    s.BANKAI_API_KEY, s.BANKAI_API_KEY_PRIMER = KUNCI_BANKAI, ""
    s.BANKAI_BASE_URL = "https://bankai.web.id/api"
    s.ADVANCE_API_KEY, s.ADVANCE_BASE_URL = KUNCI_ADVANCE, "https://api.advance.my.id/v1"
    s.PROVIDER_PRIMER, s.PROVIDER_SEKUNDER, s.STRICT_DUA_PENYEDIA = "groq", "sambanova", False

    server = ServerPalsu()

    async def tidur(_):
        return None

    base.asyncio = SimpleNamespace(sleep=tidur)
    base._buat_client = lambda timeout: httpx.AsyncClient(transport=httpx.MockTransport(server))

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        for peran, provider, kelompok, model in [
            ("kritikus", "groq", "primer", s.GROQ_MODEL_KRITIKUS),
            ("penjawab_buta", "groq", "primer", s.GROQ_MODEL_PENJAWAB_BUTA),
            ("penyusun", "sambanova", "sekunder", s.SAMBANOVA_MODEL_PENYUSUN),
            ("arbiter", "sambanova", "sekunder", s.SAMBANOVA_MODEL_ARBITER),
        ]:
            p = pilih_penyedia(peran)
            assert (p.provider, p.kelompok, p.model, p.fallback) == (provider, kelompok, model, False), peran
        assert periksa_konfigurasi() == []

        s.SAMBANOVA_API_KEY = ""
        p = pilih_penyedia("penyusun")
        assert p.provider == "groq" and p.fallback is True and p.model == s.GROQ_MODEL_PENYUSUN
        assert any("sekunder" in w for w in periksa_konfigurasi())
        s.STRICT_DUA_PENYEDIA = True
        try:
            pilih_penyedia("penyusun")
            raise AssertionError("mode ketat seharusnya menolak")
        except PenyediaTidakTersedia:
            pass
        s.GROQ_API_KEY = ""
        s.STRICT_DUA_PENYEDIA = False
        try:
            pilih_penyedia("arbiter")
            raise AssertionError("tanpa kunci apa pun seharusnya gagal")
        except PenyediaTidakTersedia:
            pass
        s.GROQ_API_KEY, s.SAMBANOVA_API_KEY = KUNCI_GROQ, KUNCI_SAMBA

        s.PROVIDER_SEKUNDER = "groq"
        assert any("independen" in w for w in periksa_konfigurasi())
        s.PROVIDER_SEKUNDER = "tidakada"
        assert any("tidak dikenali" in w for w in periksa_konfigurasi())
        s.PROVIDER_SEKUNDER = "sambanova"

        await _kosongkan_log()
        server.permintaan.clear()
        server.antrean.clear()
        server.atur("api.sambanova.ai", _jawaban(json.dumps({
            "pertanyaan": "Apa?", "pilihan": {"A": "a", "B": "b", "C": "c", "D": "d"},
            "kunci_jawaban": "A", "pembahasan": "p", "level_bloom_usulan": "C3",
        })))
        server.atur("api.groq.com", _jawaban(json.dumps({
            "skor_rubrik": {a: 4 for a in (
                "kesesuaian_materi", "kejelasan_stem", "kualitas_pengecoh",
                "kesesuaian_level_kognitif", "bebas_petunjuk",
            )},
            "catatan_kritik": "ok", "usulan_perbaikan": "-",
        })))
        await penyusun.jalankan("materi", "C3")
        await kritikus.jalankan("materi", {"pertanyaan": "x"})
        assert [r["host"] for r in server.permintaan] == ["api.sambanova.ai", "api.groq.com"]
        assert server.permintaan[0]["model"] == s.SAMBANOVA_MODEL_PENYUSUN
        assert server.permintaan[0]["auth"] == f"Bearer {KUNCI_SAMBA}"
        assert server.permintaan[1]["model"] == s.GROQ_MODEL_KRITIKUS
        assert server.permintaan[1]["auth"] == f"Bearer {KUNCI_GROQ}"

        await _kosongkan_log()
        konteks_llm.set({"guru_id": None, "butir_id": None, "percobaan_ke": 2, "ronde": 3})
        server.antrean.clear()
        server.atur("api.groq.com", _jawaban("```json\n{\"a\": 1}\n```", token=(120, 30, 150)))
        hasil = await panggil_llm("kritikus", "sistem", PROMPT_RAHASIA)
        assert hasil == {"a": 1}
        (b,) = await _baris_log()
        assert (b.peran, b.kelompok, b.provider, b.model) == ("kritikus", "primer", "groq", s.GROQ_MODEL_KRITIKUS)
        assert (b.status, b.kode_http, b.percobaan_panggilan, b.fallback) == ("sukses", 200, 1, False)
        assert (b.token_prompt, b.token_jawaban, b.token_total) == (120, 30, 150)
        assert b.latensi_ms >= 0 and b.waktu is not None
        assert (b.percobaan_butir, b.ronde) == (2, 3)

        await _kosongkan_log()
        server.atur(
            "api.groq.com",
            httpx.Response(429, headers={"retry-after": "1"}, text="terlalu cepat"),
            _jawaban(),
        )
        assert await panggil_llm("penjawab_buta", "sistem", "u") == {"ok": True}
        baris = await _baris_log()
        assert [(r.percobaan_panggilan, r.status, r.kode_http) for r in baris] == [
            (1, "rate_limit", 429),
            (2, "sukses", 200),
        ]

        await _kosongkan_log()
        server.permintaan.clear()
        server.atur("api.groq.com", httpx.Response(401, text="kunci salah"))
        try:
            await panggil_llm("kritikus", "sistem", "u")
            raise AssertionError("seharusnya gagal")
        except AgentCallFailed:
            pass
        assert len(server.permintaan) == 1
        assert [(r.status, r.kode_http) for r in await _baris_log()] == [("galat_http", 401)]

        await _kosongkan_log()
        server.permintaan.clear()
        server.atur("api.sambanova.ai", httpx.Response(402, text='{"code":"PAYMENT_METHOD_REQUIRED"}'))
        try:
            await panggil_llm("arbiter", "sistem", "u")
            raise AssertionError("seharusnya gagal")
        except AgentCallFailed as e:
            assert "saldo" in str(e) and "sambanova" in str(e) and "402" in str(e)
        assert len(server.permintaan) == 1
        (b,) = await _baris_log()
        assert (b.status, b.kode_http, b.provider) == ("galat_http", 402, "sambanova")
        assert "PAYMENT_METHOD_REQUIRED" in b.galat and len(b.galat) <= 300

        await _kosongkan_log()
        server.atur("api.groq.com", httpx.Response(503, text="mati"))
        try:
            await panggil_llm("kritikus", "sistem", "u", max_retries=2)
            raise AssertionError("seharusnya gagal")
        except AgentCallFailed as e:
            assert "groq" in str(e) and "3 percobaan" in str(e)
        assert [r.status for r in await _baris_log()] == ["galat_server"] * 3

        await _kosongkan_log()
        server.atur("api.groq.com", _jawaban("bukan json sama sekali"))
        try:
            await panggil_llm("kritikus", "sistem", "u", max_retries=1)
            raise AssertionError("seharusnya gagal")
        except AgentCallFailed:
            pass
        assert [r.status for r in await _baris_log()] == ["json_tidak_valid"] * 2
        assert all(r.token_total == 18 for r in await _baris_log()), "token tetap tercatat walau jawaban rusak"

        await _kosongkan_log()
        server.atur("api.groq.com", httpx.ReadTimeout("lambat"))
        try:
            await panggil_llm("kritikus", "sistem", "u", max_retries=0)
        except AgentCallFailed:
            pass
        (b,) = await _baris_log()
        assert b.status == "timeout" and b.kode_http is None

        await _kosongkan_log()
        server.permintaan.clear()
        server.atur("api.sambanova.ai", httpx.Response(500, text="mati"))
        server.atur("api.groq.com", _jawaban())
        try:
            await panggil_llm("arbiter", "sistem", "u", max_retries=2)
            raise AssertionError("seharusnya gagal")
        except AgentCallFailed:
            pass
        assert {r["host"] for r in server.permintaan} == {"api.sambanova.ai"}, "tidak boleh pindah penyedia"

        await _kosongkan_log()
        server.permintaan.clear()
        s.SAMBANOVA_API_KEY = ""
        server.atur("api.groq.com", _jawaban())
        await panggil_llm("penyusun", "sistem", "u")
        (b,) = await _baris_log()
        assert b.provider == "groq" and b.kelompok == "sekunder" and b.fallback is True
        s.SAMBANOVA_API_KEY = KUNCI_SAMBA

        s.GROQ_API_KEY = s.SAMBANOVA_API_KEY = ""
        try:
            await panggil_llm("arbiter", "sistem", "u")
            raise AssertionError("seharusnya gagal")
        except AgentCallFailed as e:
            assert "belum diisi" in str(e)
        s.GROQ_API_KEY, s.SAMBANOVA_API_KEY = KUNCI_GROQ, KUNCI_SAMBA

        await _kosongkan_log()
        server.permintaan.clear()
        server.antrean.clear()
        s.PROVIDER_SEKUNDER = "bankai"
        assert periksa_konfigurasi() == []
        assert {p: pilih_penyedia(p).provider for p in ("penyusun", "arbiter", "kritikus")} == {
            "penyusun": "bankai", "arbiter": "bankai", "kritikus": "groq",
        }
        s.BANKAI_BASE_URL = "https://bankai.web.id/api/"
        assert await panggil_llm("arbiter", "sistem", "u") == {"ok": True}
        (req,) = server.permintaan
        assert (req["host"], req["path"], req["model"]) == (
            "bankai.web.id", "/api/chat/completions", s.BANKAI_MODEL_ARBITER,
        )
        assert req["auth"] == f"Bearer {KUNCI_BANKAI}"
        (b,) = await _baris_log()
        assert (b.provider, b.kelompok, b.model, b.fallback) == (
            "bankai", "sekunder", s.BANKAI_MODEL_ARBITER, False,
        )

        s.BANKAI_API_KEY = ""
        assert pilih_penyedia("penyusun").fallback is True
        s.BANKAI_API_KEY = KUNCI_BANKAI
        s.PROVIDER_SEKUNDER = "sambanova"

        s.PROVIDER_PRIMER = s.PROVIDER_SEKUNDER = "bankai"
        s.BANKAI_API_KEY_PRIMER = KUNCI_BANKAI_PRIMER
        s.BANKAI_MODEL_PENYUSUN = s.BANKAI_MODEL_ARBITER = "deepseek-v4-flash"
        s.BANKAI_MODEL_KRITIKUS = s.BANKAI_MODEL_PENJAWAB_BUTA = "glm-5.2"
        assert periksa_konfigurasi() == [], "model berbeda di satu platform dianggap independen"

        await _kosongkan_log()
        server.permintaan.clear()
        server.antrean.clear()
        await panggil_llm("kritikus", "sistem", "u")
        await panggil_llm("arbiter", "sistem", "u")
        assert [(r["model"], r["auth"]) for r in server.permintaan] == [
            ("glm-5.2", f"Bearer {KUNCI_BANKAI_PRIMER}"),
            ("deepseek-v4-flash", f"Bearer {KUNCI_BANKAI}"),
        ], "tiap kelompok memakai key dan modelnya sendiri"
        assert [(b.peran, b.kelompok, b.model) for b in await _baris_log()] == [
            ("kritikus", "primer", "glm-5.2"), ("arbiter", "sekunder", "deepseek-v4-flash"),
        ]

        s.BANKAI_API_KEY_PRIMER = ""
        server.permintaan.clear()
        await panggil_llm("kritikus", "sistem", "u")
        assert server.permintaan[0]["auth"] == f"Bearer {KUNCI_BANKAI}"
        s.BANKAI_API_KEY_PRIMER = KUNCI_BANKAI_PRIMER

        s.BANKAI_MODEL_KRITIKUS = "deepseek-v4-flash"
        assert any("independen" in w and "deepseek-v4-flash" in w for w in periksa_konfigurasi())
        s.BANKAI_MODEL_KRITIKUS = "glm-5.2"

        s.PROVIDER_PRIMER, s.PROVIDER_SEKUNDER = "groq", "bankai"
        s.GROQ_API_KEY = ""
        server.permintaan.clear()
        p = pilih_penyedia("kritikus")
        assert (p.provider, p.kelompok, p.kelompok_kunci, p.fallback) == ("bankai", "primer", "sekunder", True)
        await panggil_llm("kritikus", "sistem", "u")
        assert server.permintaan[0]["auth"] == f"Bearer {KUNCI_BANKAI}"
        s.GROQ_API_KEY = KUNCI_GROQ
        s.PROVIDER_PRIMER, s.PROVIDER_SEKUNDER = "groq", "sambanova"

        await _kosongkan_log()
        server.permintaan.clear()
        server.antrean.clear()
        s.PROVIDER_PRIMER, s.PROVIDER_SEKUNDER = "bankai", "advance"
        s.BANKAI_API_KEY_PRIMER = KUNCI_BANKAI_PRIMER
        s.BANKAI_MODEL_KRITIKUS = s.BANKAI_MODEL_PENJAWAB_BUTA = "glm-5.3-flash"
        s.ADVANCE_MODEL_PENYUSUN = s.ADVANCE_MODEL_ARBITER = "deepseek-v4-pro"
        assert periksa_konfigurasi() == [], "dua penyedia berbeda: tidak ada peringatan"
        assert {p: pilih_penyedia(p).provider for p in ("penyusun", "arbiter", "kritikus", "penjawab_buta")} == {
            "penyusun": "advance", "arbiter": "advance", "kritikus": "bankai", "penjawab_buta": "bankai",
        }
        await panggil_llm("arbiter", "sistem", "u")
        await panggil_llm("kritikus", "sistem", "u")
        advance, bankai = server.permintaan
        assert (advance["host"], advance["path"], advance["model"]) == (
            "api.advance.my.id", "/v1/chat/completions", "deepseek-v4-pro",
        )
        assert advance["auth"] == f"Bearer {KUNCI_ADVANCE}"
        assert (bankai["host"], bankai["path"], bankai["model"]) == (
            "bankai.web.id", "/api/chat/completions", "glm-5.3-flash",
        )
        assert bankai["auth"] == f"Bearer {KUNCI_BANKAI_PRIMER}", "tiap sumber memakai kuncinya sendiri"
        assert [(b.peran, b.provider, b.kelompok) for b in await _baris_log()] == [
            ("arbiter", "advance", "sekunder"), ("kritikus", "bankai", "primer"),
        ]

        s.ADVANCE_API_KEY = ""
        p = pilih_penyedia("penyusun")
        assert (p.provider, p.fallback, p.kelompok_kunci) == ("bankai", True, "primer")
        assert any("sekunder" in w and "advance" in w for w in periksa_konfigurasi())
        s.ADVANCE_API_KEY = KUNCI_ADVANCE

        server.permintaan.clear()
        server.atur("api.advance.my.id", httpx.Response(402, text='{"error":"insufficient balance"}'))
        try:
            await panggil_llm("penyusun", "sistem", "u")
            raise AssertionError("seharusnya gagal")
        except AgentCallFailed as e:
            assert "advance" in str(e) and "saldo" in str(e)
        assert {r["host"] for r in server.permintaan} == {"api.advance.my.id"} and len(server.permintaan) == 1
        s.PROVIDER_PRIMER, s.PROVIDER_SEKUNDER = "groq", "sambanova"

        await _kosongkan_log()
        server.antrean.clear()
        await panggil_llm("kritikus", "sistem", PROMPT_RAHASIA)
        server.atur("api.groq.com", httpx.Response(401, text="x"))
        try:
            await panggil_llm("kritikus", "sistem", PROMPT_RAHASIA)
        except AgentCallFailed:
            pass
        for r in await _baris_log():
            semua = " ".join(str(v) for v in vars(r).values())
            assert not any(
                k in semua for k in (KUNCI_GROQ, KUNCI_SAMBA, KUNCI_BANKAI, KUNCI_BANKAI_PRIMER, KUNCI_ADVANCE, PROMPT_RAHASIA)
            )

        asli_session = base.async_session

        def rusak():
            raise RuntimeError("database mati")

        base.async_session = rusak
        server.antrean.clear()
        assert await panggil_llm("kritikus", "sistem", "u") == {"ok": True}, "log gagal tidak boleh memutus debat"
        base.async_session = asli_session

        await _kosongkan_log()
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://uji") as c:
            async def daftar(nama):
                r = await c.post(
                    "/api/auth/register",
                    json={"nama": nama, "email": f"{nama.lower()}@example.com", "password": "rahasia123"},
                )
                import uuid as _uuid
                return {"Authorization": f"Bearer {r.json()['access_token']}"}, _uuid.UUID(r.json()["user"]["id"])

            hdr_a, id_a = await daftar("GuruA")
            hdr_b, _ = await daftar("GuruB")

            server.antrean.clear()
            konteks_llm.set({"guru_id": id_a, "butir_id": None, "percobaan_ke": 1, "ronde": 1})
            server.atur("api.groq.com", _jawaban(token=(100, 50, 150)))
            await panggil_llm("kritikus", "s", "u")
            await panggil_llm("penjawab_buta", "s", "u")
            server.atur("api.sambanova.ai", httpx.Response(401, text="x"))
            try:
                await panggil_llm("arbiter", "s", "u")
            except AgentCallFailed:
                pass

            daftar_a = (await c.get("/api/log-llm", headers=hdr_a)).json()
            assert len(daftar_a) == 3 and daftar_a[0]["peran"] == "arbiter", "terbaru di atas"
            assert (await c.get("/api/log-llm?status=sukses", headers=hdr_a)).json().__len__() == 2
            assert (await c.get("/api/log-llm?peran=arbiter", headers=hdr_a)).json()[0]["status"] == "galat_http"
            assert (await c.get("/api/log-llm?provider=groq&limit=1", headers=hdr_a)).json().__len__() == 1
            assert (await c.get("/api/log-llm", headers=hdr_b)).json() == [], "log guru lain tidak boleh terlihat"
            assert (await c.get("/api/log-llm")).status_code in (401, 403)

            rk = (await c.get("/api/log-llm/ringkasan", headers=hdr_a)).json()
            assert rk["total_permintaan"] == 3 and rk["total_gagal"] == 1 and rk["total_token"] == 300
            kritik = next(r for r in rk["rincian"] if r["peran"] == "kritikus")
            assert (kritik["provider"], kritik["permintaan"], kritik["sukses"], kritik["token_total"]) == ("groq", 1, 1, 150)
            arb = next(r for r in rk["rincian"] if r["peran"] == "arbiter")
            assert (arb["provider"], arb["gagal"], arb["latensi_rata_rata_ms"]) == ("sambanova", 1, None)
            assert {t["peran"]: t["provider"] for t in rk["penugasan"]} == {
                "kritikus": "groq", "penjawab_buta": "groq", "penyusun": "sambanova", "arbiter": "sambanova",
            }
            assert rk["peringatan"] == []
            assert (await c.get("/api/log-llm/ringkasan", headers=hdr_b)).json()["total_permintaan"] == 0
    finally:
        for k, v in asli.items():
            setattr(s, k, v)
        await engine.dispose()

    print("Semua tes LLM lulus.")


def test_llm():
    asyncio.run(_jalankan())


if __name__ == "__main__":
    asyncio.run(_jalankan())
