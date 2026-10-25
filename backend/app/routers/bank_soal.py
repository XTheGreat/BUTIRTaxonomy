import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from app.database import get_db
from app.models.user import User
from app.models.butir_soal import ButirSoal
from app.models.kisi_kisi import KisiKisi, kisi_kisi_materi
from app.models.materi import Materi
from app.models.paket_ujian import PaketUjian, PaketUjianButir
from app.schemas.butir import ButirSoalResponse
from app.services.export_dokumen import buat_dokumen
from app.core.deps import get_current_guru
import io
import json

from app.services.paket import pastikan_ekspor

router = APIRouter(prefix="/api/bank-soal", tags=["bank-soal"])


@router.get("", response_model=list[ButirSoalResponse])
async def list_bank_soal(
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ButirSoal)
        .join(KisiKisi, KisiKisi.id == ButirSoal.kisi_kisi_id)
        .where(ButirSoal.status == "diterima", KisiKisi.guru_id == guru.id)
        .order_by(ButirSoal.created_at.desc())
    )
    return [ButirSoalResponse.model_validate(b) for b in result.scalars().all()]


@router.get("/kelompok")
async def kelompok_bank_soal(
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    semua = (
        await db.execute(select(KisiKisi).where(KisiKisi.guru_id == guru.id).order_by(KisiKisi.created_at))
    ).scalars().all()
    urutan = {k.id: n for n, k in enumerate(semua, start=1)}
    jumlah = {
        kid: n
        for kid, n in (
            await db.execute(
                select(ButirSoal.kisi_kisi_id, func.count(ButirSoal.id))
                .where(ButirSoal.kisi_kisi_id.in_(list(urutan)), ButirSoal.status == "diterima")
                .group_by(ButirSoal.kisi_kisi_id)
            )
        ).all()
    } if urutan else {}
    judul: dict = {}
    if urutan:
        for kid, j in (
            await db.execute(
                select(kisi_kisi_materi.c.kisi_kisi_id, Materi.judul)
                .join(Materi, Materi.id == kisi_kisi_materi.c.materi_id)
                .where(kisi_kisi_materi.c.kisi_kisi_id.in_(list(urutan)))
                .order_by(Materi.judul)
            )
        ).all():
            judul.setdefault(kid, []).append(j)
    hasil = [
        {
            "id": str(k.id),
            "nama": k.nama,
            "label": k.nama or ", ".join(judul.get(k.id, [])) or "Kisi-kisi tanpa nama",
            "urutan": urutan[k.id],
            "created_at": k.created_at,
            "jumlah_diterima": jumlah[k.id],
        }
        for k in semua
        if k.id in jumlah
    ]
    hasil.sort(key=lambda g: g["created_at"], reverse=True)
    return hasil


@router.delete("/{butir_id}")
async def delete_from_bank(
    butir_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ButirSoal)
        .join(KisiKisi, KisiKisi.id == ButirSoal.kisi_kisi_id)
        .where(ButirSoal.id == butir_id, KisiKisi.guru_id == guru.id)
    )
    butir = result.scalar_one_or_none()
    if not butir:
        raise HTTPException(status_code=404, detail="Butir tidak ditemukan")

    dipakai = await db.execute(
        select(PaketUjian.id)
        .join(PaketUjianButir, PaketUjianButir.paket_ujian_id == PaketUjian.id)
        .where(PaketUjianButir.butir_id == butir_id, PaketUjian.status == "aktif")
        .limit(1)
    )
    if dipakai.first():
        raise HTTPException(
            status_code=409,
            detail="Butir sedang dipakai dalam ujian yang aktif dan tidak bisa dihapus",
        )

    await db.delete(butir)
    await db.commit()
    return {"detail": "Butir dihapus"}


@router.get("/export")
async def export_bank_soal(
    format: str = Query("json", description="json, txt, pdf, atau docx"),
    ids: str = Query(None),
    kunci: bool = Query(True, description="Sertakan kunci jawaban dan pembahasan (pdf dan docx)"),
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    if format not in ("json", "txt", "pdf", "docx"):
        raise HTTPException(status_code=400, detail="Format ekspor harus json, txt, pdf, atau docx")
    if format in ("pdf", "docx"):
        await pastikan_ekspor(db, guru)

    query = (
        select(ButirSoal)
        .join(KisiKisi, KisiKisi.id == ButirSoal.kisi_kisi_id)
        .where(ButirSoal.status == "diterima", KisiKisi.guru_id == guru.id)
    )
    if ids:
        try:
            id_list = [uuid.UUID(i.strip()) for i in ids.split(",")]
        except ValueError:
            raise HTTPException(status_code=400, detail="Daftar id butir tidak valid")
        query = query.where(ButirSoal.id.in_(id_list))

    result = await db.execute(query.order_by(ButirSoal.created_at))
    butir_list = result.scalars().all()

    if format in ("pdf", "docx"):
        isi, media = await buat_dokumen(
            format, "Bank Soal Tervalidasi", list(butir_list), dengan_kunci=kunci,
            subjudul=f"{len(butir_list)} butir soal",
        )
        return StreamingResponse(
            io.BytesIO(isi),
            media_type=media,
            headers={"Content-Disposition": f"attachment; filename=bank_soal.{format}"},
        )

    if format == "json":
        data = []
        for b in butir_list:
            data.append({
                "pertanyaan": b.pertanyaan,
                "pilihan": b.pilihan,
                "kunci_jawaban": b.kunci_jawaban,
                "pembahasan": b.pembahasan,
                "level_bloom": b.level_bloom,
                "bobot_poin": b.bobot_poin,
            })
        content = json.dumps(data, ensure_ascii=False, indent=2)
        return StreamingResponse(
            io.BytesIO(content.encode("utf-8")),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=bank_soal.json"},
        )
    else:
        lines = []
        for i, b in enumerate(butir_list, 1):
            lines.append(f"Soal {i}. [{b.level_bloom}] {b.pertanyaan}")
            for key in ["A", "B", "C", "D"]:
                lines.append(f"  {key}. {b.pilihan.get(key, '')}")
            lines.append(f"  Kunci: {b.kunci_jawaban}")
            lines.append(f"  Pembahasan: {b.pembahasan}")
            lines.append("")

        content = "\n".join(lines)
        return StreamingResponse(
            io.BytesIO(content.encode("utf-8")),
            media_type="text/plain",
            headers={"Content-Disposition": "attachment; filename=bank_soal.txt"},
        )
