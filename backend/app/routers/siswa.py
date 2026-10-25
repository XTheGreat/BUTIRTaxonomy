import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.security import hash_token
from app.database import get_db
from app.models.paket_ujian import PaketUjian, PaketUjianButir
from app.models.butir_soal import ButirSoal
from app.models.jawaban_siswa import JawabanSiswa
from app.models.peserta_ujian import PesertaUjian, kunci_nama
from app.schemas.siswa import SiswaMasukRequest, SiswaMasukResponse, JawabanSimpan, HasilUjianResponse

router = APIRouter(prefix="/api/siswa", tags=["siswa"])

TOLERANSI_DETIK = 60


def _aware(waktu: datetime) -> datetime:
    return waktu if waktu.tzinfo else waktu.replace(tzinfo=timezone.utc)


async def _peserta_milik(db: AsyncSession, paket_id: uuid.UUID, nama_siswa: str) -> PesertaUjian | None:
    return (
        await db.execute(
            select(PesertaUjian).where(
                PesertaUjian.paket_ujian_id == paket_id,
                PesertaUjian.nama_kunci == kunci_nama(nama_siswa),
            )
        )
    ).scalar_one_or_none()


def _token_cocok(peserta: PesertaUjian, token: str | None) -> bool:
    return bool(
        token and peserta.token_hash and hmac.compare_digest(hash_token(token), peserta.token_hash)
    )


async def _autentikasi_peserta(
    db: AsyncSession, paket: PaketUjian, nama_siswa: str, token: str | None
) -> str:
    peserta = await _peserta_milik(db, paket.id, nama_siswa)
    if peserta:
        if _token_cocok(peserta, token):
            return peserta.nama_siswa
        raise HTTPException(
            status_code=403, detail="Sesi peserta tidak valid. Masuk kembali dari halaman ujian."
        )
    if await _jawaban_siswa(db, paket.id, nama_siswa):
        return nama_siswa
    raise HTTPException(status_code=403, detail="Siswa belum masuk ke ujian ini")


async def _jawaban_siswa(db: AsyncSession, paket_id: uuid.UUID, nama_siswa: str):
    hasil = await db.execute(
        select(JawabanSiswa).where(
            JawabanSiswa.paket_ujian_id == paket_id,
            JawabanSiswa.nama_siswa == nama_siswa,
        )
    )
    return hasil.scalars().all()


async def _kumpulkan(db: AsyncSession, jawaban_list: list[JawabanSiswa]):
    now = datetime.now(timezone.utc)
    for jawaban in jawaban_list:
        if jawaban.submitted_at:
            continue
        butir_result = await db.execute(
            select(ButirSoal).where(ButirSoal.id == jawaban.butir_id)
        )
        butir = butir_result.scalar_one_or_none()
        if butir:
            jawaban.benar = (
                jawaban.jawaban_pilihan == butir.kunci_jawaban
                if jawaban.jawaban_pilihan
                else False
            )
        jawaban.submitted_at = now
    await db.commit()


@router.post("/masuk", response_model=SiswaMasukResponse)
async def siswa_masuk(
    data: SiswaMasukRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PaketUjian).where(PaketUjian.kode_akses == data.kode_akses)
    )
    paket = result.scalar_one_or_none()
    if not paket:
        raise HTTPException(status_code=404, detail="Kode akses tidak ditemukan")
    if paket.status != "aktif":
        raise HTTPException(status_code=400, detail="Ujian tidak aktif")

    now = datetime.now(timezone.utc)
    if paket.waktu_mulai and now < _aware(paket.waktu_mulai):
        raise HTTPException(status_code=400, detail="Ujian belum dimulai")
    if paket.waktu_selesai and now > _aware(paket.waktu_selesai):
        raise HTTPException(status_code=400, detail="Waktu ujian sudah berakhir")

    butir_result = await db.execute(
        select(PaketUjianButir)
        .where(PaketUjianButir.paket_ujian_id == paket.id)
        .order_by(PaketUjianButir.urutan)
    )
    paket_butir_list = butir_result.scalars().all()

    token_baru: str | None = None
    peserta = await _peserta_milik(db, paket.id, data.nama_siswa)
    if peserta is None:
        token_baru = secrets.token_urlsafe(24)
        peserta = PesertaUjian(
            paket_ujian_id=paket.id,
            nama_siswa=data.nama_siswa,
            nama_kunci=kunci_nama(data.nama_siswa),
            token_hash=hash_token(token_baru),
        )
        db.add(peserta)
        try:
            await db.flush()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=409,
                detail="Nama ini baru saja dipakai peserta lain. Coba lagi dengan nama yang berbeda.",
            )
    elif peserta.token_hash is None:
        token_baru = secrets.token_urlsafe(24)
        peserta.token_hash = hash_token(token_baru)
    elif not _token_cocok(peserta, data.token):
        raise HTTPException(
            status_code=409,
            detail=(
                f"Nama \"{peserta.nama_siswa}\" sudah dipakai peserta lain di ujian ini. "
                "Bila itu Anda dan berganti perangkat, minta guru mengizinkan masuk ulang. "
                "Bila bukan, tambahkan kelas atau nomor absen pada nama Anda."
            ),
        )

    nama = peserta.nama_siswa
    existing = await _jawaban_siswa(db, paket.id, nama)
    if not existing:
        for pb in paket_butir_list:
            db.add(JawabanSiswa(paket_ujian_id=paket.id, nama_siswa=nama, butir_id=pb.butir_id))
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409, detail="Nama ini baru saja dipakai peserta lain. Coba lagi dengan nama yang berbeda."
        )

    return SiswaMasukResponse(
        paket_ujian_id=paket.id,
        nama_siswa=nama,
        judul_ujian=paket.judul,
        durasi_menit=paket.durasi_menit,
        waktu_selesai=paket.waktu_selesai,
        token_peserta=token_baru,
    )


@router.get("/ujian/{kode_akses}/soal")
async def get_soal_ujian(
    kode_akses: str,
    nama_siswa: str,
    x_peserta_token: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PaketUjian).where(PaketUjian.kode_akses == kode_akses)
    )
    paket = result.scalar_one_or_none()
    if not paket:
        raise HTTPException(status_code=404, detail="Ujian tidak ditemukan")
    if paket.status != "aktif":
        raise HTTPException(status_code=400, detail="Ujian tidak aktif")
    nama_siswa = await _autentikasi_peserta(db, paket, nama_siswa, x_peserta_token)

    butir_result = await db.execute(
        select(PaketUjianButir)
        .where(PaketUjianButir.paket_ujian_id == paket.id)
        .order_by(PaketUjianButir.urutan)
    )
    paket_butir_list = butir_result.scalars().all()

    soal_list = []
    for pb in paket_butir_list:
        br = await db.execute(select(ButirSoal).where(ButirSoal.id == pb.butir_id))
        butir = br.scalar_one_or_none()
        if butir:
            soal_list.append({
                "id": str(butir.id),
                "pertanyaan": butir.pertanyaan,
                "pilihan": butir.pilihan,
                "level_bloom": butir.level_bloom,
                "bobot_poin": butir.bobot_poin,
                "urutan": pb.urutan,
            })

    jawaban_result = await db.execute(
        select(JawabanSiswa).where(
            JawabanSiswa.paket_ujian_id == paket.id,
            JawabanSiswa.nama_siswa == nama_siswa,
        )
    )
    jawaban_list = jawaban_result.scalars().all()
    jawaban_map = {str(j.butir_id): j.jawaban_pilihan for j in jawaban_list}

    return {
        "paket_ujian_id": str(paket.id),
        "judul": paket.judul,
        "durasi_menit": paket.durasi_menit,
        "waktu_selesai": paket.waktu_selesai.isoformat() if paket.waktu_selesai else None,
        "soal": soal_list,
        "jawaban_tersimpan": jawaban_map,
    }


@router.post("/ujian/{kode_akses}/jawab")
async def simpan_jawaban(
    kode_akses: str,
    data: JawabanSimpan,
    nama_siswa: str,
    x_peserta_token: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PaketUjian).where(PaketUjian.kode_akses == kode_akses)
    )
    paket = result.scalar_one_or_none()
    if not paket:
        raise HTTPException(status_code=404, detail="Ujian tidak ditemukan")
    if paket.status != "aktif":
        raise HTTPException(status_code=400, detail="Ujian tidak aktif")
    if paket.waktu_selesai and datetime.now(timezone.utc) > _aware(
        paket.waktu_selesai
    ) + timedelta(seconds=TOLERANSI_DETIK):
        raise HTTPException(status_code=400, detail="Waktu ujian sudah berakhir")
    nama_siswa = await _autentikasi_peserta(db, paket, nama_siswa, x_peserta_token)

    jawaban_result = await db.execute(
        select(JawabanSiswa).where(
            JawabanSiswa.paket_ujian_id == paket.id,
            JawabanSiswa.nama_siswa == nama_siswa,
            JawabanSiswa.butir_id == data.butir_id,
        )
    )
    jawaban = jawaban_result.scalar_one_or_none()
    if not jawaban:
        raise HTTPException(status_code=404, detail="Butir tidak ada dalam ujian ini")

    if jawaban.submitted_at:
        raise HTTPException(status_code=400, detail="Jawaban sudah di-submit")

    jawaban.jawaban_pilihan = data.jawaban_pilihan
    await db.commit()
    return {"detail": "Jawaban disimpan"}


@router.post("/ujian/{kode_akses}/submit")
async def submit_ujian(
    kode_akses: str,
    nama_siswa: str,
    x_peserta_token: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PaketUjian).where(PaketUjian.kode_akses == kode_akses)
    )
    paket = result.scalar_one_or_none()
    if not paket:
        raise HTTPException(status_code=404, detail="Ujian tidak ditemukan")

    nama_siswa = await _autentikasi_peserta(db, paket, nama_siswa, x_peserta_token)
    jawaban_list = await _jawaban_siswa(db, paket.id, nama_siswa)

    await _kumpulkan(db, jawaban_list)
    return {"detail": "Ujian berhasil di-submit"}


@router.get("/ujian/{kode_akses}/hasil", response_model=HasilUjianResponse)
async def get_hasil(
    kode_akses: str,
    nama_siswa: str,
    x_peserta_token: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PaketUjian).where(PaketUjian.kode_akses == kode_akses)
    )
    paket = result.scalar_one_or_none()
    if not paket:
        raise HTTPException(status_code=404, detail="Ujian tidak ditemukan")

    nama_siswa = await _autentikasi_peserta(db, paket, nama_siswa, x_peserta_token)
    jawaban_list = await _jawaban_siswa(db, paket.id, nama_siswa)
    if any(j.submitted_at is None for j in jawaban_list):
        if paket.waktu_selesai and datetime.now(timezone.utc) > _aware(paket.waktu_selesai):
            await _kumpulkan(db, jawaban_list)
        else:
            raise HTTPException(status_code=403, detail="Jawaban belum dikumpulkan")

    if not paket.hasil_dirilis:
        raise HTTPException(
            status_code=423,
            detail="Jawaban Anda sudah terkumpul, tetapi hasil belum dirilis guru. Silakan cek kembali nanti.",
        )

    total_soal = len(jawaban_list)
    total_benar = sum(1 for j in jawaban_list if j.benar)

    detail = []
    for j in jawaban_list:
        butir_r = await db.execute(select(ButirSoal).where(ButirSoal.id == j.butir_id))
        butir = butir_r.scalar_one_or_none()
        detail.append({
            "butir_id": str(j.butir_id),
            "jawaban_siswa": j.jawaban_pilihan,
            "kunci_jawaban": butir.kunci_jawaban if butir else "",
            "benar": j.benar,
            "pertanyaan": butir.pertanyaan if butir else "",
        })

    skor = (total_benar / total_soal * 100) if total_soal > 0 else 0

    return HasilUjianResponse(
        nama_siswa=nama_siswa,
        judul_ujian=paket.judul,
        total_soal=total_soal,
        total_benar=total_benar,
        skor=round(skor, 2),
        detail=detail,
    )
