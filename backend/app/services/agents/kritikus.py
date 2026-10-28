import json
from app.services.agents.base import panggil_llm
from app.services.agents.skema import validasi_kritik
from app.services.agents.penyusun import FORMAT_RUMUS, pulihkan_teks_agen


SYSTEM_PROMPT = (
    "Anda adalah Agen Kritikus. Tugas Anda MENCARI KELEMAHAN pada butir soal berikut, "
    "bukan menyetujuinya. Nilai 5 aspek (skor 1-5): "
    "kesesuaian dengan materi sumber (isi soal benar menurut materi; BUKAN berarti soal boleh menyebut materi), "
    "kejelasan stem, kualitas pengecoh "
    "(apakah 3 opsi salah masuk akal, bukan asal-asalan), "
    "kesesuaian level kognitif target, bebas dari petunjuk tersembunyi "
    "(misal opsi benar lebih panjang/detail dari yang lain). "
    "PERIKSA KEMANDIRIAN SOAL: siswa mengerjakan ujian tanpa melihat materi. Jika pertanyaan atau opsi merujuk ke "
    "materi, teks, bab, halaman, atau daftar isi (mis. 'menurut materi', 'berdasarkan daftar isi'), atau soal hanya "
    "menguji struktur dokumen (judul bab, nomor halaman, penulis), beri kejelasan_stem MAKSIMAL 2, sebutkan "
    "frasanya pada catatan_kritik, dan minta pada usulan_perbaikan agar soal ditulis sebagai pengetahuan yang "
    "berdiri sendiri. "
    "Materi: {chunk}. "
    "Butir soal: {draft_json}. "
    "{format_rumus}"
    "Keluarkan HANYA JSON valid sesuai skema berikut:\n"
    '{{"skor_rubrik": {{"kesesuaian_materi": 1, "kejelasan_stem": 1, "kualitas_pengecoh": 1, '
    '"kesesuaian_level_kognitif": 1, "bebas_petunjuk": 1}}, '
    '"catatan_kritik": "string", "usulan_perbaikan": "string"}}'
)


async def jalankan(chunk: str, draft: dict) -> dict:
    system_prompt = SYSTEM_PROMPT.format(
        chunk=chunk,
        draft_json=json.dumps(draft, ensure_ascii=False),
        format_rumus=FORMAT_RUMUS,
    )

    result = await panggil_llm(
        peran="kritikus",
        system_prompt=system_prompt,
        user_prompt="Berikan kritik terhadap butir soal di atas.",
        max_tokens=6000,
        validasi=lambda data: validasi_kritik(pulihkan_teks_agen(data, ("catatan_kritik", "usulan_perbaikan"))),
    )
    return result
