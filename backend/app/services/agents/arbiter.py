import json
from app.services.agents.base import panggil_llm
from app.services.agents.mandiri import temukan_rujukan_materi
from app.services.agents.skema import validasi_keputusan
from app.services.agents.penyusun import FORMAT_RUMUS, pulihkan_teks_agen
from app.config import get_settings


DEFINISI_BLOOM = (
    "Definisi level Bloom: C1 Mengingat (menyebut, mengenali fakta); C2 Memahami (menjelaskan, menafsirkan, "
    "membandingkan); C3 Menerapkan (memakai konsep atau rumus pada situasi baru); C4 Menganalisis (menguraikan, "
    "membedakan, menghubungkan sebab-akibat atau data); C5 Mengevaluasi (menilai, membenarkan, memilih dengan "
    "kriteria); C6 Mencipta (merancang, menyusun, merumuskan sesuatu yang baru). "
)

SYSTEM_PROMPT = (
    "Anda adalah Agen Arbiter. Baca draft butir soal, kritik dari Agen Kritikus, "
    "dan jawaban Agen Penjawab Buta. Putuskan verdict. "
    "Aturan: "
    "(1) Jika skor rata-rata rubrik >= 4 DAN jawaban Agen Penjawab Buta = kunci jawaban → 'diterima'. "
    "(2) Jika ada aspek lemah yang bisa diperbaiki → 'revisi' dengan alasan konkret. "
    "(3) Jika Agen Penjawab Buta salah menjawab padahal seharusnya jelas (indikasi ambigu) "
    "→ condong ke 'revisi', turunkan prediksi_kesukaran_final. "
    "(4) Ini ronde ke-{ronde} dari maksimal {max_ronde}. "
    "(5) Siswa mengerjakan ujian tanpa melihat materi. Jika pertanyaan atau opsi merujuk ke materi, teks, bab, "
    "halaman, atau daftar isi (mis. 'menurut materi', 'berdasarkan daftar isi'), atau soal hanya menguji struktur "
    "dokumen, JANGAN 'diterima' berapa pun skornya: putuskan 'revisi' dan minta soal ditulis ulang sebagai "
    "pengetahuan yang berdiri sendiri. "
    "{level_instruksi}"
    "Draft: {draft_json}. "
    "Kritik: {kritikus_json}. "
    "Jawaban buta: {penjawab_json}. "
    "{format_rumus}"
    "Keluarkan HANYA JSON valid sesuai skema berikut:\n"
    '{{"verdict": "diterima|revisi|ditolak", "alasan": "string", '
    '"level_bloom_final": "C1|C2|C3|C4|C5|C6", "bobot_poin_final": 1, '
    '"prediksi_kesukaran_final": 0.0}}'
)


def _level_instruksi(target_level: str | None, ronde: int, max_ronde: int) -> str:
    if not target_level:
        return DEFINISI_BLOOM
    aturan = (
        f"Target level Bloom dari guru: {target_level}. Nilai level_bloom_final berdasarkan tuntutan kognitif soal "
        "yang sebenarnya, bukan kebiasaan memilih level tengah. Bila level sebenarnya berbeda dari target "
    )
    if ronde < max_ronde:
        aturan += (
            f"lebih dari satu tingkat, putuskan 'revisi' dan sebut level target {target_level} serta cara menaikkan "
            "atau menurunkan tuntutan kognitifnya pada alasan. "
        )
    else:
        aturan += "lebih dari satu tingkat, tetap isi level sebenarnya dan sebutkan selisihnya pada alasan. "
    return DEFINISI_BLOOM + aturan


async def jalankan(
    draft: dict, hasil_kritikus: dict, hasil_penjawab: dict, ronde: int, target_level: str | None = None
) -> dict:
    settings = get_settings()

    system_prompt = SYSTEM_PROMPT.format(
        ronde=ronde,
        max_ronde=settings.MAX_RONDE_DEBAT,
        level_instruksi=_level_instruksi(target_level, ronde, settings.MAX_RONDE_DEBAT),
        draft_json=json.dumps(draft, ensure_ascii=False),
        kritikus_json=json.dumps(hasil_kritikus, ensure_ascii=False),
        penjawab_json=json.dumps(hasil_penjawab, ensure_ascii=False),
        format_rumus=FORMAT_RUMUS,
    )

    result = await panggil_llm(
        peran="arbiter",
        system_prompt=system_prompt,
        user_prompt="Berikan keputusan verdict untuk butir soal di atas.",
        max_tokens=8000,
        validasi=lambda data: validasi_keputusan(pulihkan_teks_agen(data, ("alasan",))),
    )

    # Pengaman di kode: model kadang tetap menerima soal yang merujuk ke materi walau sudah dilarang.
    rujukan = temukan_rujukan_materi(draft)
    if rujukan and result.get("verdict") == "diterima":
        catatan = (
            "Soal merujuk ke materi (" + "; ".join(f"'{r}'" for r in rujukan) + ") padahal siswa tidak melihat "
            "materi saat ujian; tulis ulang sebagai pengetahuan yang berdiri sendiri. "
        )
        result = {**result, "verdict": "revisi", "alasan": (catatan + (result.get("alasan") or "")).strip()}
    return result
