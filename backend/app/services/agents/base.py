import json
import asyncio
import logging
import re
import time
from contextvars import ContextVar
import httpx
from app.config import get_settings
from app.database import async_session
from app.models.log_llm import LogLLM
from app.services.agents.penyedia import PenyediaTidakTersedia, kunci_bankai, pilih_penyedia
from app.services.agents.skema import SkemaTidakValid

logger = logging.getLogger(__name__)


class AgentCallFailed(Exception):
    pass


konteks_llm: ContextVar[dict] = ContextVar("konteks_llm", default={})

_current_key_index = 0
MAX_RETRY_AFTER_SEC = 25

_TIDAK_DIULANG = {400, 401, 402, 404, 422}
_AKUN_DITOLAK = {401, 402, 403}

_BASE_URL = {
    "groq": "https://api.groq.com/openai/v1",
    "openai": "https://api.openai.com/v1",
}


def _buat_client(timeout: float) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        timeout=httpx.Timeout(timeout, connect=15.0),
        transport=httpx.AsyncHTTPTransport(local_address="0.0.0.0", retries=2),
    )


def extract_json(content: str) -> dict:
    content = content.strip()

    try:
        return json.loads(content)
    except Exception:
        pass

    fence_pattern = r"```(?:json)?\s*([\s\S]*?)\s*```"
    matches = re.findall(fence_pattern, content, flags=re.IGNORECASE)
    for m in matches:
        try:
            return json.loads(m.strip())
        except Exception:
            pass

    start = content.find("{")
    end = content.rfind("}")
    if start != -1 and end != -1 and end > start:
        snippet = content[start : end + 1]
        try:
            return json.loads(snippet)
        except Exception:
            pass

    raise json.JSONDecodeError("Cannot parse JSON from model output", content, 0)


def _kunci_api(provider: str, kelompok: str) -> tuple[str, int, int]:
    global _current_key_index
    s = get_settings()
    if provider == "openai":
        keys = s.get_openai_keys()
        idx = _current_key_index % len(keys)
        _current_key_index = (idx + 1) % len(keys)
        return keys[idx], idx, len(keys)
    kunci = {
        "groq": s.GROQ_API_KEY,
        "sambanova": s.SAMBANOVA_API_KEY,
        "bankai": kunci_bankai(kelompok),
        "advance": s.ADVANCE_API_KEY,
        "vpsmurah": s.VPSMURAH_API_KEY,
    }
    return kunci[provider], 0, 1


def _rotate_key():
    global _current_key_index
    keys = get_settings().get_openai_keys()
    if keys:
        _current_key_index = (_current_key_index + 1) % len(keys)


async def _catat(**kolom) -> None:
    try:
        async with async_session() as db:
            db.add(LogLLM(**kolom))
            await db.commit()
    except Exception as e:
        logger.warning("Gagal menyimpan log LLM: %s", e)


BATAS_ATAS_MAX_TOKENS = 24000


def _angka(nilai) -> int | None:
    return nilai if isinstance(nilai, int) else None


async def panggil_llm(
    peran: str,
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 1024,
    temperature: float = 0.7,
    max_retries: int = 4,
    validasi=None,
) -> dict:
    settings = get_settings()
    try:
        pilihan = pilih_penyedia(peran)
    except PenyediaTidakTersedia as e:
        raise AgentCallFailed(str(e)) from e

    provider, model = pilihan.provider, pilihan.model
    base_url = {
        "sambanova": settings.SAMBANOVA_BASE_URL,
        "bankai": settings.BANKAI_BASE_URL,
        "advance": settings.ADVANCE_BASE_URL,
        "vpsmurah": settings.VPSMURAH_BASE_URL,
    }.get(provider) or _BASE_URL[provider]
    base_url = base_url.rstrip("/")
    timeout = 120.0 if provider == "openai" else 90.0
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    konteks = konteks_llm.get()

    terakhir = None
    keys_tried = 0
    percobaan = 0
    for attempt in range(max_retries + 1):
        percobaan = attempt + 1
        api_key, key_idx, total_keys = _kunci_api(provider, pilihan.kelompok_kunci or pilihan.kelompok)
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

        status, kode, galat = "galat_jaringan", None, None
        usage: dict = {}
        hasil: dict | None = None
        ulangi = True
        tidur = min(3 + attempt * 2, 10)
        mulai = time.perf_counter()

        try:
            async with _buat_client(timeout) as client:
                response = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
            kode = response.status_code

            if kode == 429 or (provider == "openai" and kode == 403):
                status = "rate_limit"
                galat = f"HTTP {kode}: {response.text[:150]}"
                retry_after = response.headers.get("retry-after")
                tunggu = min(float(retry_after) if retry_after else 5.0, MAX_RETRY_AFTER_SEC)
                if provider == "openai":
                    _rotate_key()
                    keys_tried += 1
                    tidur = 0.0
                    if keys_tried >= total_keys:
                        tidur, keys_tried = tunggu, 0
                else:
                    tidur = tunggu
                logger.warning("Rate limit %s untuk %s:%s (percobaan %s)", kode, provider, model, percobaan)
            elif kode >= 500:
                status = "galat_server"
                galat = f"HTTP {kode}"
                tidur = 5.0 if provider == "openai" else tidur
            elif kode >= 400:
                status = "galat_http"
                galat = f"HTTP {kode}: {response.text[:150]}"
                if kode in _AKUN_DITOLAK:
                    galat = (
                        f"Akun penyedia {provider} menolak permintaan (HTTP {kode}); "
                        f"periksa API key atau saldo. {response.text[:110]}"
                    )
                ulangi = kode not in _TIDAK_DIULANG and not (kode == 403 and provider != "openai")
            else:
                data = response.json()
                usage = data.get("usage") or {}
                pesan = data["choices"][0]["message"]
                selesai_karena = data["choices"][0].get("finish_reason")
                mentah = pesan.get("content") or ""
                if not mentah.strip() and pesan.get("reasoning"):
                    mentah = pesan["reasoning"] or ""
                if selesai_karena == "length" and not mentah.strip():
                    dipakai = payload["max_tokens"]
                    payload["max_tokens"] = min(dipakai * 2, BATAS_ATAS_MAX_TOKENS)
                    raise ValueError(
                        f"Jawaban terpotong: batas {dipakai} token habis sebelum jawaban selesai "
                        f"(terpakai {_angka(usage.get('completion_tokens'))} token)"
                    )
                mentah_json = extract_json(mentah)
                hasil = validasi(mentah_json) if validasi is not None else mentah_json
                status = "sukses"
        except httpx.TimeoutException as e:
            status, galat = "timeout", f"Timeout: {e}"[:200]
            if provider == "openai":
                _rotate_key()
        except httpx.HTTPError as e:
            status, galat = "galat_jaringan", f"{e.__class__.__name__}: {e}"[:200]
        except SkemaTidakValid as e:
            status, galat = "skema_tidak_valid", f"Skema tidak valid: {e}"[:200]
        except (ValueError, KeyError, IndexError, TypeError) as e:
            status, galat = "json_tidak_valid", f"{e.__class__.__name__}: {e}"[:200]

        await _catat(
            guru_id=konteks.get("guru_id"),
            butir_id=konteks.get("butir_id"),
            percobaan_butir=konteks.get("percobaan_ke"),
            ronde=konteks.get("ronde"),
            peran=peran,
            kelompok=pilihan.kelompok,
            provider=provider,
            model=model,
            fallback=pilihan.fallback,
            percobaan_panggilan=percobaan,
            status=status,
            kode_http=kode,
            latensi_ms=int((time.perf_counter() - mulai) * 1000),
            token_prompt=_angka(usage.get("prompt_tokens")),
            token_jawaban=_angka(usage.get("completion_tokens")),
            token_total=_angka(usage.get("total_tokens")),
            galat=galat,
        )

        if status == "sukses" and hasil is not None:
            return hasil

        terakhir = galat
        if not ulangi or attempt >= max_retries:
            break
        logger.warning("Panggilan %s:%s gagal (%s). Mengulang dalam %.0f detik...", provider, model, galat, tidur)
        await asyncio.sleep(tidur)

    raise AgentCallFailed(
        f"Panggilan LLM ({provider}:{model}) gagal setelah {percobaan} percobaan: {terakhir}"
    )
