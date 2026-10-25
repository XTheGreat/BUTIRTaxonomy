import asyncio
import os
import tempfile
import uuid
from datetime import datetime, timedelta, timezone

_DB_FILE = os.path.join(tempfile.mkdtemp(), "uji_debat.db")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE}"

import httpx
from sqlalchemy import select

import app.services.agents.orchestrator as orkes
from app.config import get_settings
from app.database import Base, async_session, engine
from app.main import app
from app.models.butir_soal import ButirSoal
from app.models.debat_log import DebatLog
from app.models.kisi_kisi import KisiKisi
from app.models.log_llm import LogLLM
from app.models.riwayat_percobaan import RiwayatPercobaan
from app.services.agents.base import AgentCallFailed
from app.services.analytics import hitung_daya_beda, hitung_tingkat_kesukaran
from app.services.agents.orchestrator import distribute_bloom_levels

ASPEK = ("kesesuaian_materi", "kejelasan_stem", "kualitas_pengecoh", "kesesuaian_level_kognitif", "bebas_petunjuk")


def draft(n: int = 1) -> dict:
    return {
        "pertanyaan": f"Soal {n}?",
        "pilihan": {"A": "a", "B": "b", "C": "c", "D": "d"},
        "kunci_jawaban": "B",
        "pembahasan": f"Bahas {n}",
        "level_bloom_usulan": "C3",
    }


KRITIK = {"skor_rubrik": {a: 4 for a in ASPEK}, "catatan_kritik": "catatan", "usulan_perbaikan": "perbaiki stem"}
BUTA = {"jawaban_pilihan": "B", "tingkat_keyakinan": 4, "alasan_singkat": "yakin"}


class AgenTiruan:
    def __init__(self, verdicts, error=None, tidur_penyusun=0.0, sebelum_arbiter=None):
        self.verdicts = list(verdicts)
        self.error = error
        self.tidur_penyusun = tidur_penyusun
        self.sebelum_arbiter = sebelum_arbiter
        self.catatan_revisi: list = []
        self.panggilan_penyusun = 0

    async def penyusun(self, chunk, level, catatan=None, cakupan=None):
        self.panggilan_penyusun += 1
        self.catatan_revisi.append(catatan)
        if self.tidur_penyusun:
            await asyncio.sleep(self.tidur_penyusun)
        if self.error:
            raise self.error
        return draft(self.panggilan_penyusun)

    async def kritikus(self, chunk, d):
        return KRITIK

    async def penjawab(self, d):
        return BUTA

    async def arbiter(self, d, k, j, ronde, target=None):
        if self.sebelum_arbiter:
            await self.sebelum_arbiter()
        v = self.verdicts.pop(0)
        return {"verdict": v, "alasan": f"alasan {v}", "level_bloom_final": "C4", "bobot_poin_final": 3,
                "prediksi_kesukaran_final": 0.55}

    def pasang(self):
        orkes.penyusun.jalankan = self.penyusun
        orkes.kritikus.jalankan = self.kritikus
        orkes.penjawab_buta.jalankan = self.penjawab
        orkes.arbiter.jalankan = self.arbiter


async def siapkan_butir(guru_id: uuid.UUID, kisi_id: uuid.UUID):
    async with async_session() as db:
        b = ButirSoal(kisi_kisi_id=kisi_id, status="draft", ronde_saat_ini=0, level_bloom="C3")
        db.add(b)
        await db.commit()
        return b.id, kisi_id


async def jalankan_butir(agen: AgenTiruan, guru_id, kisi_id):
    agen.pasang()
    butir_id, _ = await siapkan_butir(guru_id, kisi_id)
    await orkes.proses_satu_butir(butir_id, "C3", "materi", kisi_id)
    async with async_session() as db:
        butir = (await db.execute(select(ButirSoal).where(ButirSoal.id == butir_id))).scalar_one()
        log = (await db.execute(
            select(DebatLog).where(DebatLog.butir_id == butir_id).order_by(DebatLog.ronde, DebatLog.created_at)
        )).scalars().all()
        riwayat = (await db.execute(select(RiwayatPercobaan).where(RiwayatPercobaan.butir_id == butir_id))).scalar_one()
    return butir, log, riwayat


def uji_analisis():
    assert hitung_tingkat_kesukaran(3, 4) == 0.75
    assert hitung_tingkat_kesukaran(0, 0) == 0.0
    assert hitung_tingkat_kesukaran(10, 10) == 1.0

    siswa = [(f"s{i}", float(10 - i)) for i in range(10)]
    benar_atas = {f"s{i}": i < 3 for i in range(10)}
    assert hitung_daya_beda(siswa, benar_atas) == 1.0
    benar_bawah = {f"s{i}": i >= 7 for i in range(10)}
    assert hitung_daya_beda(siswa, benar_bawah) == -1.0, "butir yang dijawab benar kelompok bawah saja"
    assert hitung_daya_beda(siswa, {f"s{i}": True for i in range(10)}) == 0.0, "semua benar tidak membedakan"
    assert hitung_daya_beda(siswa, {}) == 0.0
    assert hitung_daya_beda(siswa[:3], {"s0": True}) == 0.0, "di bawah 4 peserta tidak dihitung"

    for jumlah, dist in [(10, {"C1": 33, "C2": 33, "C3": 34}), (7, {"C2": 50, "C5": 50}), (5, {"C4": 100})]:
        level = distribute_bloom_levels(jumlah, dist)
        assert len(level) == jumlah and set(level) <= set(dist), (jumlah, dist, level)


async def _jalankan():
    s = get_settings()
    asli = (s.MAX_RONDE_DEBAT, s.TIMEOUT_RONDE_DETIK, s.BATAS_RONDE_DETIK)
    agen_asli = (orkes.penyusun.jalankan, orkes.kritikus.jalankan, orkes.penjawab_buta.jalankan, orkes.arbiter.jalankan)
    s.MAX_RONDE_DEBAT = 3

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://uji") as c:
            r = await c.post(
                "/api/auth/register",
                json={"nama": "Guru", "email": "guru@example.com", "password": "rahasia123"},
            )
            guru_id = uuid.UUID(r.json()["user"]["id"])
            hdr = {"Authorization": f"Bearer {r.json()['access_token']}"}
            async with async_session() as db:
                kk = KisiKisi(guru_id=guru_id, jumlah_butir=1, distribusi_bloom={"C3": 100})
                db.add(kk)
                await db.commit()
                kisi_id = kk.id

            butir, log, riwayat = await jalankan_butir(AgenTiruan(["diterima"]), guru_id, kisi_id)
            assert butir.status == "diterima" and butir.ronde_saat_ini == 1
            assert (butir.pertanyaan, butir.kunci_jawaban, butir.pembahasan) == ("Soal 1?", "B", "Bahas 1")
            assert (butir.level_bloom, butir.bobot_poin, butir.prediksi_kesukaran) == ("C4", 3, 0.55)
            assert len(log) == 4 and {l.ronde for l in log} == {1}
            assert {l.agen for l in log} == {"penyusun", "kritikus", "penjawab_buta", "arbiter"}
            assert riwayat.hasil == "diterima" and riwayat.selesai is not None

            agen = AgenTiruan(["revisi", "diterima"])
            butir, log, riwayat = await jalankan_butir(agen, guru_id, kisi_id)
            assert butir.status == "diterima" and butir.ronde_saat_ini == 2 and len(log) == 8
            assert agen.catatan_revisi[0] is None
            assert "alasan revisi" in agen.catatan_revisi[1] and "perbaiki stem" in agen.catatan_revisi[1]
            assert butir.pertanyaan == "Soal 2?", "yang tersimpan adalah draf ronde terakhir"

            agen = AgenTiruan(["revisi", "revisi", "revisi"])
            butir, log, riwayat = await jalankan_butir(agen, guru_id, kisi_id)
            assert butir.status == "ditandai" and butir.ronde_saat_ini == 3 and len(log) == 12
            assert butir.pertanyaan == "Soal 3?" and riwayat.hasil == "ditandai"

            butir, log, riwayat = await jalankan_butir(AgenTiruan(["ditolak"]), guru_id, kisi_id)
            assert butir.status == "ditolak" and butir.pertanyaan == "Soal 1?" and riwayat.hasil == "ditolak"

            butir, log, riwayat = await jalankan_butir(
                AgenTiruan([], error=AgentCallFailed("Panggilan LLM (bankai:x) gagal")), guru_id, kisi_id
            )
            assert butir.status == "tertunda" and "gagal" in butir.alasan_tertunda
            assert butir.pertanyaan == "" and log == [] and riwayat.hasil == "tertunda"

            s.TIMEOUT_RONDE_DETIK = 1
            mulai = datetime.now()
            butir, log, riwayat = await jalankan_butir(AgenTiruan(["diterima"], tidur_penyusun=5), guru_id, kisi_id)
            lama = (datetime.now() - mulai).total_seconds()
            assert lama < 4, f"batas ronde harus memutus penantian (dipakai {lama:.1f} detik)"
            assert butir.status == "tertunda" and "melebihi batas waktu 1 detik" in butir.alasan_tertunda
            assert riwayat.hasil == "tertunda"
            s.TIMEOUT_RONDE_DETIK = 300

            async def hentikan():
                async with async_session() as db:
                    b = (await db.execute(select(ButirSoal).where(ButirSoal.status == "debating"))).scalar_one()
                    b.status = "tertunda"
                    b.alasan_tertunda = orkes.ALASAN_DIHENTIKAN
                    await db.commit()

            butir, log, riwayat = await jalankan_butir(
                AgenTiruan(["diterima"], sebelum_arbiter=hentikan), guru_id, kisi_id
            )
            assert butir.status == "tertunda" and butir.alasan_tertunda == orkes.ALASAN_DIHENTIKAN
            assert riwayat.hasil == "dihentikan" and butir.pertanyaan == ""

            class ArbiterGagalRonde2(AgenTiruan):
                gagal = True

                async def arbiter(self, d, k, j, ronde, target=None):
                    if ronde == 2 and self.gagal:
                        raise AgentCallFailed("Panggilan LLM (bankai:x) gagal")
                    return await super().arbiter(d, k, j, ronde, target)

            agen = ArbiterGagalRonde2(["revisi", "diterima"])
            butir, log, riwayat = await jalankan_butir(agen, guru_id, kisi_id)
            assert butir.status == "tertunda" and butir.ronde_saat_ini == 2 and agen.panggilan_penyusun == 2
            agen.gagal = False
            async with async_session() as db:
                b = (await db.execute(select(ButirSoal).where(ButirSoal.id == butir.id))).scalar_one()
                await orkes.antrekan_retry(db, [b])
            await orkes.proses_satu_butir(butir.id, "C3", "materi", kisi_id)
            async with async_session() as db:
                b = (await db.execute(select(ButirSoal).where(ButirSoal.id == butir.id))).scalar_one()
                lanjut = (await db.execute(
                    select(DebatLog).where(DebatLog.butir_id == butir.id, DebatLog.percobaan_ke == b.percobaan_ke)
                )).scalars().all()
            assert b.status == "diterima" and b.percobaan_ke == 2
            assert agen.panggilan_penyusun == 2, "penyusun ronde 2 tidak dipanggil ulang"
            assert len(lanjut) == 8 and b.pertanyaan == "Soal 2?"

            agen = ArbiterGagalRonde2(["revisi", "diterima"])
            butir, log, riwayat = await jalankan_butir(agen, guru_id, kisi_id)
            agen.gagal = False
            async with async_session() as db:
                b = (await db.execute(select(ButirSoal).where(ButirSoal.id == butir.id))).scalar_one()
                await orkes.antrekan_retry(db, [b], mulai_ulang=True)
            await orkes.proses_satu_butir(butir.id, "C3", "materi", kisi_id)
            assert agen.panggilan_penyusun == 3, "mulai ulang menyusun dari ronde 1"

            sekarang = datetime.now(timezone.utc).replace(microsecond=0)
            butir_id = uuid.uuid4()
            async with async_session() as db:
                def baris(peran, ronde, selesai, latensi_s):
                    return LogLLM(
                        guru_id=guru_id, butir_id=butir_id, percobaan_butir=1, ronde=ronde, peran=peran,
                        kelompok="primer", provider="bankai", model="m", status="sukses", kode_http=200,
                        waktu=selesai, latensi_ms=int(latensi_s * 1000),
                    )

                db.add_all([
                    baris("penyusun", 1, sekarang - timedelta(seconds=35), 40),
                    baris("kritikus", 1, sekarang - timedelta(seconds=15), 20),
                    baris("penjawab_buta", 1, sekarang - timedelta(seconds=17), 18),
                    baris("arbiter", 1, sekarang, 15),
                    baris("penyusun", 2, sekarang + timedelta(seconds=10), 10),
                    baris("arbiter", 2, sekarang + timedelta(seconds=30), 18),
                ])
                await db.commit()

            rk = (await c.get("/api/log-llm/ringkasan", headers=hdr)).json()["ronde"]
            assert rk["batas_detik"] == 60 and rk["jumlah"] == 2
            assert rk["maks_detik"] == 75.0 and rk["melewati_batas"] == 1 and rk["persen_melewati_batas"] == 50.0
            assert 40 <= rk["rata_rata_detik"] <= 55, rk
    finally:
        s.MAX_RONDE_DEBAT, s.TIMEOUT_RONDE_DETIK, s.BATAS_RONDE_DETIK = asli
        (orkes.penyusun.jalankan, orkes.kritikus.jalankan, orkes.penjawab_buta.jalankan, orkes.arbiter.jalankan) = agen_asli
        await engine.dispose()


def test_debat():
    uji_analisis()
    asyncio.run(_jalankan())


if __name__ == "__main__":
    uji_analisis()
    asyncio.run(_jalankan())
    print("Semua tes debat lulus.")
