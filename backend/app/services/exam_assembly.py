from dataclasses import dataclass, field

from app.services.cakupan import kata_kunci, skor_potongan


def hitung_target_per_level(jumlah_target: int, distribusi_bloom: dict[str, int]) -> dict[str, int]:
    total_pct = sum(distribusi_bloom.values())
    if jumlah_target <= 0 or total_pct <= 0:
        return {}

    mentah = {lv: jumlah_target * pct / total_pct for lv, pct in distribusi_bloom.items() if pct > 0}
    target = {lv: int(v) for lv, v in mentah.items()}
    sisa = jumlah_target - sum(target.values())
    urutan = sorted(mentah, key=lambda lv: (mentah[lv] - target[lv], mentah[lv]), reverse=True)
    for lv in urutan[:sisa]:
        target[lv] += 1
    return {lv: n for lv, n in target.items() if n > 0}


@dataclass
class HasilRakitan:
    terpilih: list = field(default_factory=list)
    kekurangan: dict[str, int] = field(default_factory=dict)
    kurang_total: int = 0
    ada_cakupan: bool = False
    cocok_cakupan: int = 0
    bobot_total: int = 0


def _bobot(b) -> int:
    return b.bobot_poin or 0


def _teks_standar(b) -> str:
    pilihan = " ".join((b.pilihan or {}).values())
    return f"{b.pertanyaan or ''} {pilihan} {b.pembahasan or ''}"


def _dekati_bobot(terpilih: list, sisa: list, target: int, relevan) -> None:
    total = sum(_bobot(b) for b in terpilih)
    for _ in range(max(len(terpilih) * len(sisa), 1)):
        selisih = abs(total - target)
        if selisih == 0:
            return
        terbaik = None
        for i, a in enumerate(terpilih):
            for j, b in enumerate(sisa):
                if a.level_bloom != b.level_bloom or relevan(a) != relevan(b):
                    continue
                baru = total - _bobot(a) + _bobot(b)
                if abs(baru - target) < selisih and (terbaik is None or abs(baru - target) < terbaik[0]):
                    terbaik = (abs(baru - target), i, j, baru)
        if terbaik is None:
            return
        _, i, j, total = terbaik
        terpilih[i], sisa[j] = sisa[j], terpilih[i]


def rakit_paket(
    butir_list: list,
    jumlah_target: int,
    distribusi_bloom: dict[str, int] | None = None,
    cakupan: str | None = None,
    target_bobot: int | None = None,
    teks_butir=_teks_standar,
) -> HasilRakitan:
    hasil = HasilRakitan()
    kunci = kata_kunci(cakupan)
    hasil.ada_cakupan = bool(kunci)
    skor = {id(b): skor_potongan(teks_butir(b), kunci) for b in butir_list} if kunci else {}

    def relevan(b) -> bool:
        return skor.get(id(b), 0) > 0

    sisa_pool = sorted(butir_list, key=lambda b: -skor.get(id(b), 0)) if kunci else list(butir_list)

    if distribusi_bloom:
        for level, jumlah in hitung_target_per_level(jumlah_target, distribusi_bloom).items():
            cocok = [b for b in sisa_pool if b.level_bloom == level][:jumlah]
            hasil.terpilih.extend(cocok)
            for b in cocok:
                sisa_pool.remove(b)
            if len(cocok) < jumlah:
                hasil.kekurangan[level] = jumlah - len(cocok)

    butuh = jumlah_target - len(hasil.terpilih)
    if butuh > 0:
        hasil.terpilih.extend(sisa_pool[:butuh])
        sisa_pool = sisa_pool[butuh:]

    if target_bobot is not None:
        _dekati_bobot(hasil.terpilih, sisa_pool, target_bobot, relevan)

    hasil.kurang_total = max(0, jumlah_target - len(hasil.terpilih))
    hasil.cocok_cakupan = sum(1 for b in hasil.terpilih if relevan(b))
    hasil.bobot_total = sum(_bobot(b) for b in hasil.terpilih)
    return hasil


def select_butir_for_exam(
    butir_list: list,
    jumlah_target: int,
    distribusi_bloom: dict[str, int] | None = None,
) -> list:
    return rakit_paket(butir_list, jumlah_target, distribusi_bloom).terpilih
