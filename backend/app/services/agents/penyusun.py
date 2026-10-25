import json
from app.services.agents.base import panggil_llm
from app.services.agents.skema import validasi_draft


SYSTEM_PROMPT = (
    "Anda adalah Agen Penyusun dalam sistem BUTIR. "
    "Buat SATU butir soal pilihan ganda (4 opsi A-D) HANYA berdasarkan potongan materi berikut — "
    "jangan gunakan pengetahuan di luar materi ini. "
    "Target level kognitif Bloom: {target_level}. {panduan_level}"
    "{revisi_instruksi}"
    "{cakupan_instruksi}"
    "Materi: {chunk}. "
    "{format_rumus}"
    "Keluarkan HANYA JSON valid sesuai skema berikut, tanpa teks lain:\n"
    '{{"pertanyaan": "string", "pilihan": {{"A": "string", "B": "string", "C": "string", "D": "string"}}, '
    '"kunci_jawaban": "A|B|C|D", "pembahasan": "string", "level_bloom_usulan": "C1|C2|C3|C4|C5|C6"}}'
)

PANDUAN_LEVEL = {
    "C1": "C1 Mengingat: tanyakan fakta, istilah, atau definisi yang tertulis di materi.",
    "C2": "C2 Memahami: minta siswa menjelaskan, menafsirkan, atau membandingkan konsep dengan kata-kata lain.",
    "C3": "C3 Menerapkan: beri situasi atau data baru, siswa memakai konsep atau rumus dari materi untuk menyelesaikannya.",
    "C4": (
        "C4 Menganalisis: beri data, kasus, atau pernyataan yang harus diuraikan; siswa membedakan, menghubungkan "
        "sebab-akibat, atau menemukan bagian yang keliru."
    ),
    "C5": (
        "C5 Mengevaluasi: beri dua atau lebih pilihan, klaim, atau hasil kerja; siswa menilai mana yang paling tepat dan "
        "alasannya berdasarkan kriteria dari materi. Opsi berupa penilaian yang beralasan, bukan fakta."
    ),
    "C6": (
        "C6 Mencipta: beri tujuan atau kendala nyata; siswa memilih rancangan, rumusan, atau kombinasi langkah terbaik "
        "yang menyatukan beberapa konsep dari materi menjadi sesuatu yang baru. Setiap opsi harus berupa rancangan "
        "utuh yang masuk akal, dan hanya satu yang memenuhi seluruh kendala. Bukan soal mengingat atau menghitung."
    ),
}

FORMAT_RUMUS = (
    r"Format rumus: tulis setiap rumus matematika atau kimia dalam LaTeX yang diapit \( dan \), "
    r"misalnya \(x^2 + 3x\). Untuk zat dan reaksi kimia gunakan \ce{...} di dalam \( \), "
    r"misalnya \(\ce{Pb^2+(aq) + 2I^-(aq) -> PbI2(s)}\); jangan menyusun rumus kimia dengan \text{}. "
    r"Teks biasa tetap di luar pembatas. Karena keluaran berupa JSON, setiap backslash WAJIB ditulis "
    r"ganda (\\(, \\ce, \\frac). "
)

_PULIHKAN_KONTROL = {
    "\t": r"\t",
    "\r": r"\r",
    "\f": r"\f",
    "\x08": r"\b",
}


def _pulihkan_backslash(teks):
    if not isinstance(teks, str):
        return teks
    for karakter, pengganti in _PULIHKAN_KONTROL.items():
        teks = teks.replace(karakter, pengganti)
    return teks


def pulihkan_teks_agen(hasil: dict, kunci_teks: tuple[str, ...]) -> dict:
    for kunci in kunci_teks:
        if kunci in hasil:
            hasil[kunci] = _pulihkan_backslash(hasil[kunci])
    return hasil


def _pulihkan_draft(draft: dict) -> dict:
    for kunci in ("pertanyaan", "pembahasan"):
        if kunci in draft:
            draft[kunci] = _pulihkan_backslash(draft[kunci])
    if isinstance(draft.get("pilihan"), dict):
        draft["pilihan"] = {k: _pulihkan_backslash(v) for k, v in draft["pilihan"].items()}
    return draft


async def jalankan(
    chunk: str, target_level: str, catatan_revisi: str | None = None, cakupan: str | None = None
) -> dict:
    revisi_instruksi = ""
    if catatan_revisi:
        revisi_instruksi = f"Ini ronde revisi. Perbaiki sesuai catatan berikut: {catatan_revisi}. "

    cakupan_instruksi = ""
    if cakupan:
        cakupan_instruksi = (
            f"Guru meminta soal difokuskan pada cakupan berikut (selama masih ada di materi): {cakupan}. "
        )

    system_prompt = SYSTEM_PROMPT.format(
        target_level=target_level,
        panduan_level=(PANDUAN_LEVEL.get(target_level, "") + " Soal harus benar-benar menuntut level ini, bukan level di bawahnya. ") if PANDUAN_LEVEL.get(target_level) else "",
        revisi_instruksi=revisi_instruksi,
        cakupan_instruksi=cakupan_instruksi,
        chunk=chunk,
        format_rumus=FORMAT_RUMUS,
    )

    result = await panggil_llm(
        peran="penyusun",
        system_prompt=system_prompt,
        user_prompt="Buatkan satu butir soal sesuai instruksi di atas.",
        max_tokens=12000,
        validasi=validasi_draft,
    )
    return _pulihkan_draft(result)
