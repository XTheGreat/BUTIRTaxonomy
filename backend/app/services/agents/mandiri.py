"""Penjaga soal mandiri.

Siswa mengerjakan ujian tanpa melihat materi, jadi pertanyaan dan opsi tidak boleh merujuk ke
"materi", teks, bab, halaman, atau daftar isi. Prompt sudah melarangnya, tetapi model sering
melanggar; pengecekan ini menangkap frasa yang paling umum agar draf bisa ditulis ulang.

Polanya sengaja spesifik: "materi genetik" atau "teks" di soal yang memang memuat kutipan
lengkap tidak boleh ikut tertangkap.
"""

import re

_BERHENTI = (
    r"(?=\s*(?:[,.?:;)…]|$|adalah\b|tersebut\b|di\s+atas\b|berikut\b|ini\b|itu\b|tadi\b|"
    r"yang\s+(?:telah|sudah|dipelajari)\b|ajar\b|pelajaran\b|pembelajaran\b|perkuliahan\b|kuliah\b|bacaan\b))"
)

_BAKU = re.I | re.S

# Selalu dianggap rujukan, di pertanyaan maupun opsi.
_POLA_PASTI = [
    re.compile(
        r"\b(?:menurut|berdasarkan|sesuai(?:\s+dengan)?|merujuk\s+(?:pada|ke)|mengacu\s+(?:pada|ke)|dalam|pada|dari)"
        r"\s+(?:isi\s+)?materi" + _BERHENTI,
        _BAKU,
    ),
    re.compile(r"\b(?:daftar\s+isi|kata\s+pengantar|halaman\s+judul|halaman\s+sampul|hak\s+cipta)\b", _BAKU),
    re.compile(r"\b(?:halaman|hlm\.?)\s*\d+\b", _BAKU),
    re.compile(r"\b(?:pelajaran|bab|modul|unit|subbab)\s+(?:\d+|[IVXLC]+)\b", _BAKU),
    re.compile(
        r"\b(?:menurut|berdasarkan|sesuai(?:\s+dengan)?)\s+(?:artikel|buku|modul|jurnal|makalah|penulis|pengarang)\b",
        _BAKU,
    ),
    re.compile(r"\bdalam\s+(?:artikel|modul|jurnal|makalah)\s+(?:tersebut|ini|itu)\b", _BAKU),
    re.compile(
        r"\b(?:according\s+to|based\s+on|as\s+(?:stated|described|explained)\s+in)\s+the\s+"
        r"(?:text|article|passage|material|reading|module|chapter|book|lesson)\b",
        _BAKU,
    ),
]

# Rujukan ke "teks/bacaan" sah bila kutipannya ikut tertulis di soal, jadi hanya dihitung pada
# pertanyaan pendek tanpa kutipan.
_POLA_TEKS = re.compile(
    r"\b(?:menurut|berdasarkan|sesuai(?:\s+dengan)?|dalam|pada)\s+(?:isi\s+)?"
    r"(?:teks|bacaan|wacana|paragraf|kutipan|narasi)\b",
    _BAKU,
)
_BATAS_KATA_PERTANYAAN_PENDEK = 45


def temukan_rujukan_materi(draft: dict) -> list[str]:
    """Daftar frasa pada pertanyaan/opsi yang merujuk ke materi; kosong bila soal sudah mandiri."""
    pertanyaan = str(draft.get("pertanyaan") or "")
    opsi = [str(v) for v in (draft.get("pilihan") or {}).values()]

    hasil: list[str] = []
    for teks in [pertanyaan, *opsi]:
        for pola in _POLA_PASTI:
            for m in pola.finditer(teks):
                hasil.append(m.group(0).strip())

    pendek = len(pertanyaan.split()) < _BATAS_KATA_PERTANYAAN_PENDEK
    tanpa_kutipan = "\n" not in pertanyaan and not re.search(r"[\"“”]", pertanyaan)
    if pendek and tanpa_kutipan:
        hasil.extend(m.group(0).strip() for m in _POLA_TEKS.finditer(pertanyaan))

    unik: list[str] = []
    for frasa in hasil:
        if frasa.casefold() not in {u.casefold() for u in unik}:
            unik.append(frasa)
    return unik[:5]
