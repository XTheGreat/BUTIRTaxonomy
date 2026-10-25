import asyncio
import json
import os
import tempfile
from types import SimpleNamespace

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_agen.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"

import httpx
from sqlalchemy import select

import app.services.agents.base as base
from app.config import get_settings
from app.database import Base, async_session, engine
import app.main
from app.models.log_llm import LogLLM
from app.services.agents import arbiter, kritikus, penjawab_buta, penyusun
from app.services.agents.base import AgentCallFailed
from app.services.agents.skema import (
    SkemaTidakValid,
    validasi_draft,
    validasi_jawaban_buta,
    validasi_keputusan,
    validasi_kritik,
)

ASPEK = ("kesesuaian_materi", "kejelasan_stem", "kualitas_pengecoh", "kesesuaian_level_kognitif", "bebas_petunjuk")


def draft(**ubah):
    d = {
        "pertanyaan": "Organel apa tempat fotosintesis?",
        "pilihan": {"A": "Mitokondria", "B": "Kloroplas", "C": "Ribosom", "D": "Nukleus"},
        "kunci_jawaban": "B",
        "pembahasan": "Di kloroplas.",
        "level_bloom_usulan": "C1",
    }
    d.update(ubah)
    return d


def harus_gagal(fungsi, data, potongan_pesan: str):
    try:
        fungsi(data)
    except SkemaTidakValid as e:
        assert potongan_pesan in str(e), f"pesan {str(e)!r} tidak memuat {potongan_pesan!r}"
        return
    raise AssertionError(f"seharusnya SkemaTidakValid ({potongan_pesan}) untuk {data!r}")


def uji_validator():
    d = validasi_draft(draft(kunci_jawaban=" b. ", pertanyaan="  Apa?  "))
    assert d["kunci_jawaban"] == "B" and d["pertanyaan"] == "Apa?", "kunci dan teks dinormalisasi"
    d = validasi_draft(draft(pilihan={"a": "1", "b": "2", "c": "3", "d": "4"}))
    assert list(d["pilihan"]) == ["A", "B", "C", "D"], "kunci opsi huruf kecil dinormalisasi dan diurutkan"
    assert validasi_draft(draft(pembahasan=None))["pembahasan"] == ""

    harus_gagal(validasi_draft, "bukan objek", "objek JSON")
    harus_gagal(validasi_draft, draft(pertanyaan="  "), "pertanyaan")
    harus_gagal(validasi_draft, draft(kunci_jawaban="E"), "kunci_jawaban")
    harus_gagal(validasi_draft, draft(kunci_jawaban=None), "kunci_jawaban")
    harus_gagal(validasi_draft, draft(pilihan={"A": "1", "B": "2", "C": "3"}), "tepat opsi")
    harus_gagal(validasi_draft, draft(pilihan={"A": "1", "B": "2", "C": "3", "D": "4", "E": "5"}), "tepat opsi")
    harus_gagal(validasi_draft, draft(pilihan={"A": "1", "B": "", "C": "3", "D": "4"}), "wajib diisi")
    harus_gagal(validasi_draft, draft(pilihan={"A": "sama", "B": "SAMA", "C": "3", "D": "4"}), "berbeda")
    harus_gagal(validasi_draft, draft(pilihan=["a", "b"]), "objek JSON")
    harus_gagal(validasi_draft, draft(level_bloom_usulan="C9"), "level_bloom_usulan")

    ok = {"skor_rubrik": {a: 4 for a in ASPEK}, "catatan_kritik": "bagus", "usulan_perbaikan": "-"}
    assert validasi_kritik(ok)["skor_rubrik"] == {a: 4 for a in ASPEK}
    assert validasi_kritik({**ok, "skor_rubrik": {a: "3" for a in ASPEK}})["skor_rubrik"]["kejelasan_stem"] == 3
    assert validasi_kritik({"skor_rubrik": {a: 5 for a in ASPEK}})["catatan_kritik"] == "", "catatan opsional"
    kurang = {a: 4 for a in ASPEK[:-1]}
    harus_gagal(validasi_kritik, {**ok, "skor_rubrik": kurang}, "bebas_petunjuk")
    harus_gagal(validasi_kritik, {**ok, "skor_rubrik": {**{a: 4 for a in ASPEK}, "kejelasan_stem": 7}}, "1 sampai 5")
    harus_gagal(validasi_kritik, {**ok, "skor_rubrik": {**{a: 4 for a in ASPEK}, "kejelasan_stem": 0}}, "1 sampai 5")
    harus_gagal(validasi_kritik, {**ok, "skor_rubrik": {**{a: 4 for a in ASPEK}, "kejelasan_stem": "tinggi"}}, "angka")
    harus_gagal(validasi_kritik, {**ok, "skor_rubrik": {**{a: 4 for a in ASPEK}, "kejelasan_stem": True}}, "angka")
    harus_gagal(validasi_kritik, {"catatan_kritik": "x"}, "skor_rubrik")

    j = validasi_jawaban_buta({"jawaban_pilihan": "c", "tingkat_keyakinan": 9, "alasan_singkat": "yakin"})
    assert (j["jawaban_pilihan"], j["tingkat_keyakinan"]) == ("C", 5), "keyakinan dijepit ke 1-5"
    assert validasi_jawaban_buta({"jawaban_pilihan": "A"})["alasan_singkat"] == ""
    harus_gagal(validasi_jawaban_buta, {"jawaban_pilihan": "Z"}, "jawaban_pilihan")
    harus_gagal(validasi_jawaban_buta, {"alasan_singkat": "x"}, "jawaban_pilihan")
    harus_gagal(validasi_jawaban_buta, {"jawaban_pilihan": "A", "tingkat_keyakinan": "?"}, "angka")

    k = validasi_keputusan(
        {"verdict": " Diterima ", "alasan": "ok", "level_bloom_final": "c4", "bobot_poin_final": "2", "prediksi_kesukaran_final": 0.6}
    )
    assert (k["verdict"], k["level_bloom_final"], k["bobot_poin_final"], k["prediksi_kesukaran_final"]) == (
        "diterima", "C4", 2, 0.6,
    )
    assert validasi_keputusan({"verdict": "revisi", "prediksi_kesukaran_final": 65})["prediksi_kesukaran_final"] == 0.65, "persen diubah jadi proporsi"
    minim = validasi_keputusan({"verdict": "ditolak"})
    assert "level_bloom_final" not in minim and "bobot_poin_final" not in minim, "kolom opsional yang kosong dibuang"
    harus_gagal(validasi_keputusan, {"verdict": "mungkin"}, "verdict")
    harus_gagal(validasi_keputusan, {"alasan": "x"}, "verdict")
    harus_gagal(validasi_keputusan, {"verdict": "diterima", "level_bloom_final": "C7"}, "level_bloom_final")
    harus_gagal(validasi_keputusan, {"verdict": "diterima", "bobot_poin_final": 0}, "bobot_poin_final")
    harus_gagal(validasi_keputusan, {"verdict": "diterima", "prediksi_kesukaran_final": 250}, "prediksi_kesukaran_final")
    harus_gagal(validasi_keputusan, {"verdict": "diterima", "prediksi_kesukaran_final": "sulit"}, "angka")


def _balas(isi) -> httpx.Response:
    return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps(isi)}}], "usage": {"total_tokens": 10}})


async def uji_agen_dan_log():
    s = get_settings()
    asli = {k: getattr(s, k) for k in ("GROQ_API_KEY", "SAMBANOVA_API_KEY", "PROVIDER_PRIMER", "PROVIDER_SEKUNDER", "STRICT_DUA_PENYEDIA")}
    s.GROQ_API_KEY, s.SAMBANOVA_API_KEY = "g", "s"
    s.PROVIDER_PRIMER, s.PROVIDER_SEKUNDER, s.STRICT_DUA_PENYEDIA = "groq", "sambanova", False

    jawaban: list = []
    base.asyncio = SimpleNamespace(sleep=lambda _: asyncio.sleep(0))
    base._buat_client = lambda t: httpx.AsyncClient(transport=httpx.MockTransport(lambda r: _balas(jawaban.pop(0))))

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        jawaban[:] = [draft(kunci_jawaban="E"), draft(kunci_jawaban="B")]
        hasil = await penyusun.jalankan("materi", "C1")
        assert hasil["kunci_jawaban"] == "B"
        async with async_session() as db:
            baris = (await db.execute(select(LogLLM).order_by(LogLLM.waktu, LogLLM.percobaan_panggilan))).scalars().all()
        assert [b.status for b in baris] == ["skema_tidak_valid", "sukses"]
        assert "kunci_jawaban" in baris[0].galat and baris[0].percobaan_panggilan == 1

        jawaban[:] = [{"verdict": "mungkin"}] * 5
        try:
            await arbiter.jalankan(draft(), {}, {}, 1)
            raise AssertionError("seharusnya gagal")
        except AgentCallFailed as e:
            assert "verdict" in str(e) and "5 percobaan" in str(e)

        jawaban[:] = [{"jawaban_pilihan": "b", "tingkat_keyakinan": 4, "alasan_singkat": "yakin"}]
        assert (await penjawab_buta.jalankan(draft()))["jawaban_pilihan"] == "B"
        jawaban[:] = [{"skor_rubrik": {a: 5 for a in ASPEK}, "catatan_kritik": "c", "usulan_perbaikan": "u"}]
        assert (await kritikus.jalankan("materi", draft()))["skor_rubrik"]["bebas_petunjuk"] == 5
        jawaban[:] = [{"verdict": "DITERIMA", "alasan": "a", "level_bloom_final": "C2", "prediksi_kesukaran_final": 70}]
        k = await arbiter.jalankan(draft(), {}, {}, 1)
        assert (k["verdict"], k["prediksi_kesukaran_final"]) == ("diterima", 0.7)

        for modul in (kritikus, penjawab_buta, arbiter):
            assert "{format_rumus}" in modul.SYSTEM_PROMPT, f"{modul.__name__} wajib memuat instruksi format rumus"
        jawaban[:] = [{"skor_rubrik": {a: 5 for a in ASPEK}, "catatan_kritik": "nilai \x0crac{1}{2} \x08eta", "usulan_perbaikan": "\tau"}]
        h = await kritikus.jalankan("materi", draft())
        assert h["catatan_kritik"] == r"nilai \frac{1}{2} \beta" and h["usulan_perbaikan"] == r"\tau"
        jawaban[:] = [{"jawaban_pilihan": "b", "tingkat_keyakinan": 4, "alasan_singkat": "\x0crac{a}{b}"}]
        assert (await penjawab_buta.jalankan(draft()))["alasan_singkat"] == r"\frac{a}{b}"
        jawaban[:] = [{"verdict": "revisi", "alasan": "\x0corall", "level_bloom_final": "C2", "prediksi_kesukaran_final": 0.5}]
        assert (await arbiter.jalankan(draft(), {}, {}, 1))["alasan"] == r"\forall"
    finally:
        for kunci, nilai in asli.items():
            setattr(s, kunci, nilai)
        await engine.dispose()


def test_agen():
    uji_validator()
    asyncio.run(uji_agen_dan_log())


if __name__ == "__main__":
    uji_validator()
    asyncio.run(uji_agen_dan_log())
    print("Semua tes agen lulus.")
