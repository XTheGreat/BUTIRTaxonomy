import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.paket_ujian import PaketUjian, PaketUjianButir
from app.models.butir_soal import ButirSoal
from app.models.jawaban_siswa import JawabanSiswa
from app.core.deps import get_current_guru
from app.services.analytics import hitung_tingkat_kesukaran, hitung_daya_beda

router = APIRouter(prefix="/api/ujian", tags=["laporan"])

MIN_PESERTA_DAYA_BEDA = 4
MIN_PESERTA_BERMAKNA = 30


@router.get("/{ujian_id}/laporan")
async def get_laporan(
    ujian_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PaketUjian).where(PaketUjian.id == ujian_id))
    paket = result.scalar_one_or_none()
    if not paket:
        raise HTTPException(status_code=404, detail="Ujian tidak ditemukan")
    if paket.guru_id != guru.id:
        raise HTTPException(status_code=403, detail="Bukan ujian Anda")

    pb_result = await db.execute(
        select(PaketUjianButir)
        .where(PaketUjianButir.paket_ujian_id == ujian_id)
        .order_by(PaketUjianButir.urutan)
    )
    paket_butir_list = pb_result.scalars().all()
    butir_ids = [pb.butir_id for pb in paket_butir_list]

    jawaban_result = await db.execute(
        select(JawabanSiswa).where(
            JawabanSiswa.paket_ujian_id == ujian_id,
            JawabanSiswa.submitted_at.isnot(None),
        )
    )
    all_jawaban = jawaban_result.scalars().all()

    siswa_scores: dict[str, float] = {}
    for j in all_jawaban:
        if j.nama_siswa not in siswa_scores:
            siswa_scores[j.nama_siswa] = 0
        if j.benar:
            siswa_scores[j.nama_siswa] += 1

    skor_total_per_siswa = [(nama, skor) for nama, skor in siswa_scores.items()]
    total_peserta = len(skor_total_per_siswa)

    analisis_butir = []
    for butir_id in butir_ids:
        br = await db.execute(select(ButirSoal).where(ButirSoal.id == butir_id))
        butir = br.scalar_one_or_none()
        if not butir:
            continue

        butir_jawaban = [j for j in all_jawaban if j.butir_id == butir_id]
        jawaban_benar = sum(1 for j in butir_jawaban if j.benar)

        tingkat_kesukaran = hitung_tingkat_kesukaran(jawaban_benar, total_peserta)

        jawaban_per_butir = {j.nama_siswa: j.benar for j in butir_jawaban}
        daya_beda = hitung_daya_beda(skor_total_per_siswa, jawaban_per_butir)

        analisis_butir.append({
            "butir_id": str(butir_id),
            "pertanyaan": butir.pertanyaan,
            "level_bloom": butir.level_bloom,
            "prediksi_kesukaran": butir.prediksi_kesukaran,
            "tingkat_kesukaran_aktual": tingkat_kesukaran,
            "daya_beda": daya_beda,
            "total_jawab": len(butir_jawaban),
            "total_benar": jawaban_benar,
        })

    return {
        "ujian_id": str(ujian_id),
        "judul": paket.judul,
        "total_peserta": total_peserta,
        "daya_beda_dihitung": total_peserta >= MIN_PESERTA_DAYA_BEDA,
        "daya_beda_indikatif": total_peserta < MIN_PESERTA_BERMAKNA,
        "min_peserta_bermakna": MIN_PESERTA_BERMAKNA,
        "analisis_butir": analisis_butir,
    }
