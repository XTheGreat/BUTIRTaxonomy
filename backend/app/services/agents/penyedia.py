from dataclasses import dataclass

from app.config import get_settings

PERAN = ("penyusun", "kritikus", "penjawab_buta", "arbiter")

KELOMPOK_PERAN = {
    "kritikus": "primer",
    "penjawab_buta": "primer",
    "penyusun": "sekunder",
    "arbiter": "sekunder",
}

PENYEDIA_DIKENAL = ("groq", "sambanova", "bankai", "advance", "vpsmurah", "openai")


class PenyediaTidakTersedia(Exception):
    pass


@dataclass(frozen=True)
class Pilihan:
    provider: str
    model: str
    kelompok: str
    fallback: bool = False
    kelompok_kunci: str = ""


def kunci_bankai(kelompok: str) -> str:
    s = get_settings()
    if kelompok == "primer" and s.BANKAI_API_KEY_PRIMER:
        return s.BANKAI_API_KEY_PRIMER
    return s.BANKAI_API_KEY


def punya_kunci(provider: str, kelompok: str = "sekunder") -> bool:
    s = get_settings()
    if provider == "groq":
        return bool(s.GROQ_API_KEY)
    if provider == "sambanova":
        return bool(s.SAMBANOVA_API_KEY)
    if provider == "bankai":
        return bool(kunci_bankai(kelompok))
    if provider == "advance":
        return bool(s.ADVANCE_API_KEY)
    if provider == "vpsmurah":
        return bool(s.VPSMURAH_API_KEY)
    if provider == "openai":
        return bool(s.get_openai_keys())
    return False


def model_untuk(provider: str, peran: str) -> str:
    nama = f"{provider.upper()}_MODEL_{peran.upper()}"
    model = getattr(get_settings(), nama, None)
    if not model:
        raise PenyediaTidakTersedia(f"Model untuk peran '{peran}' di penyedia '{provider}' belum diatur ({nama})")
    return model


def _penyedia_kelompok(kelompok: str) -> str:
    s = get_settings()
    provider = (s.PROVIDER_PRIMER if kelompok == "primer" else s.PROVIDER_SEKUNDER).lower()
    if provider not in PENYEDIA_DIKENAL:
        raise PenyediaTidakTersedia(f"Penyedia '{provider}' tidak dikenali. Pilih salah satu: {', '.join(PENYEDIA_DIKENAL)}")
    return provider


def pilih_penyedia(peran: str) -> Pilihan:
    if peran not in KELOMPOK_PERAN:
        raise PenyediaTidakTersedia(f"Peran agen tidak dikenali: {peran}")
    s = get_settings()
    kelompok = KELOMPOK_PERAN[peran]
    provider = _penyedia_kelompok(kelompok)

    if punya_kunci(provider, kelompok):
        return Pilihan(provider, model_untuk(provider, peran), kelompok, kelompok_kunci=kelompok)

    if s.STRICT_DUA_PENYEDIA:
        raise PenyediaTidakTersedia(
            f"API key penyedia {kelompok} ({provider}) belum diisi dan STRICT_DUA_PENYEDIA aktif"
        )

    lain = "sekunder" if kelompok == "primer" else "primer"
    cadangan = _penyedia_kelompok(lain)
    if cadangan != provider and punya_kunci(cadangan, lain):
        return Pilihan(
            cadangan, model_untuk(cadangan, peran), kelompok, fallback=True, kelompok_kunci=lain
        )

    raise PenyediaTidakTersedia(f"API key untuk penyedia {kelompok} ({provider}) belum diisi di backend/.env")


def periksa_konfigurasi() -> list[str]:
    s = get_settings()
    peringatan: list[str] = []
    try:
        primer, sekunder = _penyedia_kelompok("primer"), _penyedia_kelompok("sekunder")
    except PenyediaTidakTersedia as e:
        return [str(e)]

    if primer == sekunder:
        try:
            model_primer = {model_untuk(primer, r) for r, k in KELOMPOK_PERAN.items() if k == "primer"}
            model_sekunder = {model_untuk(sekunder, r) for r, k in KELOMPOK_PERAN.items() if k == "sekunder"}
        except PenyediaTidakTersedia as e:
            return [str(e)]
        sama = sorted(model_primer & model_sekunder)
        if sama:
            peringatan.append(
                f"Penyedia Primer dan Sekunder sama-sama '{primer}' dan memakai model yang sama "
                f"({', '.join(sama)}): hasil debat tidak independen."
            )
    for kelompok, provider in (("primer", primer), ("sekunder", sekunder)):
        if not punya_kunci(provider, kelompok):
            akibat = "peran terkait akan gagal" if s.STRICT_DUA_PENYEDIA else "peran terkait dialihkan ke penyedia lain"
            peringatan.append(f"API key penyedia {kelompok} ({provider}) belum diisi; {akibat}.")
    return peringatan
