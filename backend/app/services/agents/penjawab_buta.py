import json
from app.services.agents.base import panggil_llm
from app.services.agents.skema import validasi_jawaban_buta
from app.services.agents.penyusun import FORMAT_RUMUS, pulihkan_teks_agen


SYSTEM_PROMPT = (
    "Anda adalah Agen Penjawab Buta. Anda TIDAK diberi tahu kunci jawaban. "
    "Jawab soal berikut seolah Anda siswa yang mengerjakan ujian berdasarkan pemahaman Anda sendiri. "
    "Pertanyaan: {pertanyaan}. "
    "A. {A} "
    "B. {B} "
    "C. {C} "
    "D. {D}. "
    "{format_rumus}"
    "Keluarkan HANYA JSON valid sesuai skema berikut:\n"
    '{{"jawaban_pilihan": "A|B|C|D", "tingkat_keyakinan": 1, "alasan_singkat": "string"}}'
)


async def jalankan(draft: dict) -> dict:
    pilihan = draft.get("pilihan", {})
    system_prompt = SYSTEM_PROMPT.format(
        pertanyaan=draft.get("pertanyaan", ""),
        A=pilihan.get("A", ""),
        B=pilihan.get("B", ""),
        C=pilihan.get("C", ""),
        D=pilihan.get("D", ""),
        format_rumus=FORMAT_RUMUS,
    )

    result = await panggil_llm(
        peran="penjawab_buta",
        system_prompt=system_prompt,
        user_prompt="Jawab soal di atas.",
        max_tokens=5000,
        validasi=lambda data: validasi_jawaban_buta(pulihkan_teks_agen(data, ("alasan_singkat",))),
    )
    return result
