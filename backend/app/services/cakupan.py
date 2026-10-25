import re

_KATA_UMUM = {
    "yang", "dan", "di", "ke", "dari", "untuk", "pada", "dengan", "dalam", "atau", "itu", "ini", "adalah",
    "akan", "oleh", "para", "serta", "juga", "agar", "bab", "fokus", "fokuskan", "materi", "soal", "butir",
    "tentang", "terkait", "mengenai", "bagian", "konsep", "penerapannya", "the", "of", "and",
}
_PORSI_MINIMAL = 0.4


def kata_kunci(cakupan: str | None) -> list[str]:
    if not cakupan:
        return []
    hasil: list[str] = []
    for kata in re.findall(r"[0-9A-Za-zÀ-ÿ]+", cakupan.lower()):
        if (len(kata) >= 3 or kata.isdigit()) and kata not in _KATA_UMUM and kata not in hasil:
            hasil.append(kata)
    return hasil


def skor_potongan(teks: str, kunci: list[str]) -> float:
    if not kunci:
        return 0.0
    bawah = teks.lower()
    return sum(1 for k in kunci if k in bawah) / len(kunci)


def pilih_potongan(potongan: list, cakupan: str | None, ambil_teks=lambda p: p.content) -> tuple[list, bool]:
    kunci = kata_kunci(cakupan)
    if not kunci:
        return list(potongan), False

    skor = [(skor_potongan(ambil_teks(p), kunci), i, p) for i, p in enumerate(potongan)]
    terbaik = max((s for s, _, _ in skor), default=0.0)
    if terbaik <= 0:
        return list(potongan), False

    terpilih = [(s, i, p) for s, i, p in skor if s >= terbaik * _PORSI_MINIMAL]
    terpilih.sort(key=lambda x: (-x[0], x[1]))
    return [p for _, _, p in terpilih], True
