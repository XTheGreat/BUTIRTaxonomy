import asyncio
import json
import os
import tempfile
from types import SimpleNamespace

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_mandiri.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"

import httpx

import app.services.agents.base as base
from app.config import get_settings
from app.database import Base, engine
import app.main
from app.services.agents import arbiter, kritikus, penyusun
from app.services.agents.mandiri import temukan_rujukan_materi
from app.services.chunking import potongan_bermakna


def draft(pertanyaan, **opsi):
    pilihan = {"A": "Mitokondria", "B": "Kloroplas", "C": "Ribosom", "D": "Nukleus"}
    pilihan.update(opsi)
    return {"pertanyaan": pertanyaan, "pilihan": pilihan, "kunci_jawaban": "B", "pembahasan": "Di kloroplas."}


def uji_deteksi_rujukan():
    # Kalimat nyata dari soal yang bermasalah.
    melanggar = [
        "Berdasarkan materi, taktik ganjalan dilakukan dengan menggunakan teknik ...",
        "Menurut materi, yang dimaksud dengan taktik adalah ...",
        "Rancangan taktik penyerangan yang paling tepat sesuai materi adalah ...",
        "Berdasarkan daftar isi, judul Pelajaran 4 adalah ....",
        "Pada halaman 12 dijelaskan bahwa fotosintesis terjadi di ...",
        "Apa itu bab 3 buku ini? Menurut penulis, jawabannya ...",
        "According to the text, photosynthesis happens in the ...",
        "Dalam materi tersebut, organel apa tempat fotosintesis?",
        "Berdasarkan teks di atas, organel apa tempat fotosintesis?",
    ]
    for teks in melanggar:
        assert temukan_rujukan_materi(draft(teks)), f"seharusnya terdeteksi: {teks!r}"

    # Opsi yang merujuk ke materi juga dihitung.
    assert temukan_rujukan_materi(draft("Organel apa tempat fotosintesis?", A="Sesuai materi, mitokondria"))

    # Soal mandiri dan istilah sah tidak boleh tertangkap.
    aman = [
        "Organel apa tempat fotosintesis?",
        "Materi genetik pada virus HIV berupa ...",
        "Berdasarkan materi genetik tersebut, kesimpulan yang benar adalah ...",
        "Ani menulis catatan di buku hariannya setiap hari. Apa jenis teks ini?",
        "Zat radioaktif adalah materi yang memancarkan ...",
        "Bab ini tidak relevan",  # 'bab ini' bukan nomor bab
        # Soal berbasis stimulus: kutipan ikut ditulis di soal, jadi rujukan ke teks itu sah.
        "Bacalah kutipan berikut.\n\"Fotosintesis mengubah cahaya menjadi energi kimia di kloroplas.\"\n"
        "Berdasarkan teks tersebut, organel tempat fotosintesis adalah ...",
        "Perhatikan paragraf berikut: " + " ".join(["kata"] * 60) + ". Berdasarkan paragraf di atas, simpulan yang tepat adalah ...",
    ]
    for teks in aman:
        hasil = temukan_rujukan_materi(draft(teks))
        assert not hasil, f"tidak boleh terdeteksi: {teks!r} -> {hasil}"

    # Pembahasan boleh menyebut materi (tidak diperiksa).
    d = draft("Organel apa tempat fotosintesis?")
    d["pembahasan"] = "Materi menyatakan fotosintesis terjadi di kloroplas."
    assert not temukan_rujukan_materi(d)


def uji_potongan_bermakna():
    isi = (
        "Fotosintesis adalah proses pembuatan makanan oleh tumbuhan hijau menggunakan cahaya matahari, air, dan "
        "karbon dioksida. Proses ini terjadi di kloroplas yang mengandung klorofil. Hasilnya berupa glukosa dan oksigen."
    )
    assert potongan_bermakna(isi)

    assert not potongan_bermakna("Kata Pengantar"), "terlalu pendek"

    daftar_isi = "\n".join(
        [
            "DAFTAR ISI",
            "Pelajaran 1 : Memahami Konsep Dasar Gerak ............ 1",
            "Pelajaran 2 : Menganalisis Teknik Permainan Bola Besar ............ 14",
            "Pelajaran 3 : Merancang Rangkaian Gerak Ritmik ............ 29",
            "Pelajaran 4 : Menganalisis, Merancang, Dan Mengevaluasi Taktik Dan Strategi Beladiri Pencaksilat ............ 41",
            "Pelajaran 5 : Mengevaluasi Kebugaran Jasmani Secara Mandiri ............ 58",
            "Pelajaran 6 : Menerapkan Pola Hidup Sehat Dan Aktif ............ 72",
            "Daftar Pustaka ............ 90",
        ]
    )
    assert not potongan_bermakna(daftar_isi)

    # Daftar judul tanpa nomor halaman pun dikenali dari pola awal barisnya.
    daftar_judul = "\n".join(f"Bab {i} Pembahasan Konsep Nomor {i} Dalam Pelajaran Olahraga Dan Kesehatan" for i in range(1, 9))
    assert not potongan_bermakna(daftar_judul)

    # Penanda "## Halaman N" dari pengekstrak tidak boleh membuat isi sungguhan dikira daftar isi.
    berpenanda = "\n".join(
        f"## Halaman {30 + i}\n● Konsep {i} ○ Yaitu instruksi khusus dalam bahasa pemrograman untuk mengulang beberapa perintah sesuai instruksi yang ditentukan"
        for i in range(10)
    )
    assert potongan_bermakna(berpenanda)
    assert not potongan_bermakna("## Halaman 3\n### SEMISIMPLICITY, PURITY AND MUMFORD–TATE CONJECTURE 3"), "hanya header"

    # Daftar berbutir yang memang isi pelajaran (baris panjang) tidak ikut terbuang.
    berbutir = "\n".join(
        f"{i}. Langkah ke-{i} dalam teknik beladiri ini dilakukan dengan menjaga keseimbangan tubuh, mengatur napas, "
        "dan memusatkan pandangan pada lawan sebelum bergerak."
        for i in range(1, 8)
    )
    assert potongan_bermakna(berbutir)


def _balas(isi) -> httpx.Response:
    return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps(isi)}}], "usage": {"total_tokens": 10}})


async def uji_penulisan_ulang_dan_pengaman():
    s = get_settings()
    asli = {k: getattr(s, k) for k in ("GROQ_API_KEY", "SAMBANOVA_API_KEY", "PROVIDER_PRIMER", "PROVIDER_SEKUNDER", "STRICT_DUA_PENYEDIA")}
    s.GROQ_API_KEY, s.SAMBANOVA_API_KEY = "g", "s"
    s.PROVIDER_PRIMER, s.PROVIDER_SEKUNDER, s.STRICT_DUA_PENYEDIA = "groq", "sambanova", False

    jawaban: list = []
    prompt_terkirim: list[str] = []

    def tangani(request: httpx.Request) -> httpx.Response:
        prompt_terkirim.append(json.loads(request.content)["messages"][0]["content"])
        return _balas(jawaban.pop(0))

    base.asyncio = SimpleNamespace(sleep=lambda _: asyncio.sleep(0))
    base._buat_client = lambda t: httpx.AsyncClient(transport=httpx.MockTransport(tangani))

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        # Prompt memuat aturan soal mandiri.
        for modul, kata in ((penyusun, "SOAL MANDIRI"), (kritikus, "KEMANDIRIAN SOAL"), (arbiter, "tanpa melihat materi")):
            assert kata in modul.SYSTEM_PROMPT, f"{modul.__name__} harus memuat aturan kemandirian soal"

        # Draf melanggar lalu bersih: ditulis ulang, dan putaran kedua diberi tahu frasa yang salah.
        jawaban[:] = [draft("Menurut materi, organel apa tempat fotosintesis?"), draft("Organel apa tempat fotosintesis?")]
        hasil = await penyusun.jalankan("potongan", "C1")
        assert hasil["pertanyaan"] == "Organel apa tempat fotosintesis?" and len(prompt_terkirim) == 2
        assert "Menurut materi" in prompt_terkirim[1] and "Menurut materi" not in prompt_terkirim[0]

        # Tetap melanggar setelah batas: draf terakhir diserahkan (Kritikus dan Arbiter yang menilai).
        prompt_terkirim.clear()
        jawaban[:] = [draft("Menurut materi, apa fotosintesis?")] * (1 + penyusun.MAKS_PERBAIKAN_MANDIRI)
        hasil = await penyusun.jalankan("potongan", "C1")
        assert len(prompt_terkirim) == 1 + penyusun.MAKS_PERBAIKAN_MANDIRI and "materi" in hasil["pertanyaan"]

        # Draf bersih: satu panggilan saja.
        prompt_terkirim.clear()
        jawaban[:] = [draft("Organel apa tempat fotosintesis?")]
        await penyusun.jalankan("potongan", "C1")
        assert len(prompt_terkirim) == 1

        # Pengaman Arbiter: 'diterima' pada soal yang merujuk ke materi diubah menjadi 'revisi'.
        keputusan = {"verdict": "diterima", "alasan": "Bagus.", "level_bloom_final": "C1", "prediksi_kesukaran_final": 0.5}
        jawaban[:] = [dict(keputusan)]
        k = await arbiter.jalankan(draft("Berdasarkan daftar isi, apa judul Pelajaran 4?"), {}, {}, 1)
        assert k["verdict"] == "revisi" and "daftar isi" in k["alasan"] and "Bagus." in k["alasan"], k

        jawaban[:] = [dict(keputusan)]
        k = await arbiter.jalankan(draft("Organel apa tempat fotosintesis?"), {}, {}, 1)
        assert k["verdict"] == "diterima", "soal mandiri tetap boleh diterima"

        jawaban[:] = [{**keputusan, "verdict": "ditolak"}]
        k = await arbiter.jalankan(draft("Menurut materi, apa itu sel?"), {}, {}, 1)
        assert k["verdict"] == "ditolak", "hanya 'diterima' yang diubah"
    finally:
        for kunci, nilai in asli.items():
            setattr(s, kunci, nilai)
        await engine.dispose()


def test_mandiri():
    uji_deteksi_rujukan()
    uji_potongan_bermakna()
    asyncio.run(uji_penulisan_ulang_dan_pengaman())


if __name__ == "__main__":
    uji_deteksi_rujukan()
    uji_potongan_bermakna()
    asyncio.run(uji_penulisan_ulang_dan_pengaman())
    print("Semua tes soal mandiri lulus.")
