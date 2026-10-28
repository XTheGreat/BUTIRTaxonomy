import json
import logging
from app.services.agents.base import panggil_llm
from app.services.agents.mandiri import temukan_rujukan_materi
from app.services.agents.skema import validasi_draft

logger = logging.getLogger(__name__)

# Berapa kali draf yang masih merujuk ke materi ditulis ulang otomatis sebelum diserahkan ke Kritikus.
MAKS_PERBAIKAN_MANDIRI = 2

ATURAN_MANDIRI = (
    "ATURAN SOAL MANDIRI: siswa mengerjakan ujian TANPA melihat materi. Karena itu pertanyaan dan opsi "
    "DILARANG menyebut atau merujuk ke materi, teks, bacaan, artikel, modul, buku, bab, halaman, daftar isi, "
    "atau nomor pelajaran, dan dilarang memakai frasa seperti 'menurut materi', 'berdasarkan materi', "
    "'sesuai materi', atau 'berdasarkan daftar isi'. Tulis pertanyaan sebagai pengetahuan yang berdiri sendiri. "
    "Jika soal membutuhkan data, kasus, atau kutipan, tuliskan lengkap di dalam soal. "
    "Jangan membuat soal tentang struktur dokumen (daftar isi, judul bab, nomor halaman, penulis, tahun terbit, "
    "kata pengantar); abaikan bagian materi yang hanya berupa itu dan ambil konsep intinya. "
)


SYSTEM_PROMPT = (
    "Anda adalah Agen Penyusun dalam sistem BUTIR. "
    "Buat SATU butir soal pilihan ganda (4 opsi A-D) HANYA berdasarkan potongan materi berikut — "
    "jangan gunakan pengetahuan di luar materi ini. "
    f"{ATURAN_MANDIRI}"
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
    "C1": "C1 Mengingat: tanyakan fakta, istilah, atau definisi yang diajarkan dalam materi, tanpa menyebut materinya.",
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

    panduan_level = (
        (PANDUAN_LEVEL.get(target_level, "") + " Soal harus benar-benar menuntut level ini, bukan level di bawahnya. ")
        if PANDUAN_LEVEL.get(target_level)
        else ""
    )

    hasil: dict = {}
    for percobaan in range(1 + MAKS_PERBAIKAN_MANDIRI):
        system_prompt = SYSTEM_PROMPT.format(
            target_level=target_level,
            panduan_level=panduan_level,
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
        hasil = _pulihkan_draft(result)

        rujukan = temukan_rujukan_materi(hasil)
        if not rujukan:
            return hasil
        if percobaan >= MAKS_PERBAIKAN_MANDIRI:
            # Batas penulisan ulang habis: draf terakhir diserahkan ke Kritikus dan Arbiter,
            # yang juga memeriksa kemandirian soal.
            logger.warning("Draf tetap merujuk ke materi (%s) setelah %s kali ditulis ulang", rujukan, percobaan)
            break
        logger.warning("Draf merujuk ke materi (%s); menulis ulang (%s/%s)", rujukan, percobaan + 1, MAKS_PERBAIKAN_MANDIRI)
        # Putaran berikutnya diberi tahu apa yang salah.
        revisi_instruksi = (
            (f"Ini ronde revisi. Perbaiki sesuai catatan berikut: {catatan_revisi}. " if catatan_revisi else "")
            + "Draf sebelumnya melanggar aturan soal mandiri karena memuat rujukan ke materi: "
            + "; ".join(f"'{r}'" for r in rujukan)
            + ". Tulis ulang soal lengkap tanpa rujukan apa pun ke materi, teks, bab, halaman, atau daftar isi, "
            "sehingga bisa dijawab siswa yang tidak melihat materi. "
        )
    return hasil
