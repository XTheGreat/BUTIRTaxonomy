OPSI = ("A", "B", "C", "D")
LEVEL_BLOOM = {"C1", "C2", "C3", "C4", "C5", "C6"}
VERDICT = {"diterima", "revisi", "ditolak"}
ASPEK_RUBRIK = (
    "kesesuaian_materi",
    "kejelasan_stem",
    "kualitas_pengecoh",
    "kesesuaian_level_kognitif",
    "bebas_petunjuk",
)


class SkemaTidakValid(ValueError):
    pass


def _dict(nilai, nama: str) -> dict:
    if not isinstance(nilai, dict):
        raise SkemaTidakValid(f"{nama} harus berupa objek JSON")
    return nilai


def _teks(nilai, nama: str, wajib: bool = True) -> str:
    if nilai is None or (isinstance(nilai, str) and not nilai.strip()):
        if wajib:
            raise SkemaTidakValid(f"'{nama}' wajib diisi")
        return ""
    if not isinstance(nilai, (str, int, float)) or isinstance(nilai, bool):
        raise SkemaTidakValid(f"'{nama}' harus berupa teks")
    return str(nilai).strip()


def _angka(nilai, nama: str) -> float:
    if isinstance(nilai, bool):
        raise SkemaTidakValid(f"'{nama}' harus berupa angka")
    try:
        return float(nilai)
    except (TypeError, ValueError):
        raise SkemaTidakValid(f"'{nama}' harus berupa angka") from None


def _opsi(nilai, nama: str) -> str:
    huruf = _teks(nilai, nama).upper().rstrip(".)")
    if huruf not in OPSI:
        raise SkemaTidakValid(f"'{nama}' harus salah satu dari A, B, C, D (diterima: {huruf!r})")
    return huruf


def _level(nilai, nama: str) -> str:
    level = _teks(nilai, nama).upper()
    if level not in LEVEL_BLOOM:
        raise SkemaTidakValid(f"'{nama}' harus C1 sampai C6 (diterima: {level!r})")
    return level


def validasi_draft(data) -> dict:
    d = dict(_dict(data, "Draf butir"))
    d["pertanyaan"] = _teks(d.get("pertanyaan"), "pertanyaan")

    pilihan = _dict(d.get("pilihan"), "pilihan")
    norm = {str(k).strip().upper().rstrip(".)"): _teks(v, f"pilihan.{k}") for k, v in pilihan.items()}
    if set(norm) != set(OPSI):
        raise SkemaTidakValid(f"'pilihan' harus berisi tepat opsi A, B, C, D (diterima: {sorted(norm)})")
    if len({v.casefold() for v in norm.values()}) < len(OPSI):
        raise SkemaTidakValid("Keempat opsi jawaban harus berbeda satu sama lain")
    d["pilihan"] = {k: norm[k] for k in OPSI}

    d["kunci_jawaban"] = _opsi(d.get("kunci_jawaban"), "kunci_jawaban")
    d["pembahasan"] = _teks(d.get("pembahasan"), "pembahasan", wajib=False)
    if d.get("level_bloom_usulan") is not None:
        d["level_bloom_usulan"] = _level(d["level_bloom_usulan"], "level_bloom_usulan")
    return d


def validasi_kritik(data) -> dict:
    d = dict(_dict(data, "Kritik"))
    skor = _dict(d.get("skor_rubrik"), "skor_rubrik")
    hasil = {}
    for aspek in ASPEK_RUBRIK:
        if aspek not in skor:
            raise SkemaTidakValid(f"'skor_rubrik.{aspek}' tidak ada")
        nilai = _angka(skor[aspek], f"skor_rubrik.{aspek}")
        if not 1 <= nilai <= 5:
            raise SkemaTidakValid(f"'skor_rubrik.{aspek}' harus 1 sampai 5 (diterima: {nilai:g})")
        hasil[aspek] = int(nilai) if nilai == int(nilai) else round(nilai, 1)
    d["skor_rubrik"] = hasil
    d["catatan_kritik"] = _teks(d.get("catatan_kritik"), "catatan_kritik", wajib=False)
    d["usulan_perbaikan"] = _teks(d.get("usulan_perbaikan"), "usulan_perbaikan", wajib=False)
    return d


def validasi_jawaban_buta(data) -> dict:
    d = dict(_dict(data, "Jawaban buta"))
    d["jawaban_pilihan"] = _opsi(d.get("jawaban_pilihan"), "jawaban_pilihan")
    if d.get("tingkat_keyakinan") is not None:
        d["tingkat_keyakinan"] = min(5, max(1, round(_angka(d["tingkat_keyakinan"], "tingkat_keyakinan"))))
    d["alasan_singkat"] = _teks(d.get("alasan_singkat"), "alasan_singkat", wajib=False)
    return d


def validasi_keputusan(data) -> dict:
    d = dict(_dict(data, "Keputusan"))
    verdict = _teks(d.get("verdict"), "verdict").lower()
    if verdict not in VERDICT:
        raise SkemaTidakValid(f"'verdict' harus diterima, revisi, atau ditolak (diterima: {verdict!r})")
    d["verdict"] = verdict
    d["alasan"] = _teks(d.get("alasan"), "alasan", wajib=False)

    if d.get("level_bloom_final") is not None:
        d["level_bloom_final"] = _level(d["level_bloom_final"], "level_bloom_final")
    else:
        d.pop("level_bloom_final", None)

    if d.get("bobot_poin_final") is not None:
        bobot = round(_angka(d["bobot_poin_final"], "bobot_poin_final"))
        if not 1 <= bobot <= 100:
            raise SkemaTidakValid(f"'bobot_poin_final' harus 1 sampai 100 (diterima: {bobot})")
        d["bobot_poin_final"] = bobot
    else:
        d.pop("bobot_poin_final", None)

    if d.get("prediksi_kesukaran_final") is not None:
        p = _angka(d["prediksi_kesukaran_final"], "prediksi_kesukaran_final")
        if 1 < p <= 100:
            p /= 100
        if not 0 <= p <= 1:
            raise SkemaTidakValid(f"'prediksi_kesukaran_final' harus 0 sampai 1 (diterima: {p:g})")
        d["prediksi_kesukaran_final"] = round(p, 4)
    else:
        d.pop("prediksi_kesukaran_final", None)
    return d
