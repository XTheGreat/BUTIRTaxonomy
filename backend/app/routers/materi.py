import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.materi import Materi, MateriChunk
from app.schemas.materi import MateriResponse
from app.core.deps import get_current_guru
from app.services.chunking import chunk_text
from app.services.pdf_converter import convert_pdf_to_markdown
from app.services.docx_converter import convert_docx_to_markdown
import os

from app.services.paket import pastikan_kuota_materi

router = APIRouter(prefix="/api/materi", tags=["materi"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

FORMAT_DIDUKUNG = {".pdf", ".docx", ".txt", ".md", ".text"}
MAKS_UKURAN_BYTE = 10 * 1024 * 1024


@router.post("", response_model=MateriResponse, status_code=201)
async def upload_materi(
    judul: str = Form(...),
    file: UploadFile = File(...),
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    await pastikan_kuota_materi(db, guru)
    file_id = uuid.uuid4()
    original_filename = os.path.basename((file.filename or "materi").replace("\\", "/")) or "materi"
    ekstensi = os.path.splitext(original_filename)[1].lower()
    if ekstensi not in FORMAT_DIDUKUNG:
        raise HTTPException(
            status_code=400,
            detail="Format berkas tidak didukung. Gunakan PDF, DOCX, TXT, atau MD.",
        )

    content_bytes = await file.read(MAKS_UKURAN_BYTE + 1)
    if len(content_bytes) > MAKS_UKURAN_BYTE:
        raise HTTPException(
            status_code=413,
            detail=f"Ukuran berkas melebihi batas {MAKS_UKURAN_BYTE // (1024 * 1024)} MB.",
        )

    try:
        if ekstensi == ".pdf":
            text_content = convert_pdf_to_markdown(content_bytes, filename=original_filename)
        elif ekstensi == ".docx":
            text_content = convert_docx_to_markdown(content_bytes, filename=original_filename)
        else:
            try:
                text_content = content_bytes.decode("utf-8")
            except UnicodeDecodeError:
                text_content = content_bytes.decode("latin-1")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Gagal memproses berkas {ekstensi.upper()[1:]}: {e}"
        )

    if not text_content or not text_content.strip():
        raise HTTPException(
            status_code=400,
            detail="Berkas tidak memiliki isi teks yang dapat diproses."
        )

    file_path = os.path.join(UPLOAD_DIR, f"{file_id}_{original_filename}")
    with open(file_path, "wb") as f:
        f.write(content_bytes)
    if ekstensi in (".pdf", ".docx"):
        with open(f"{file_path}.md", "w", encoding="utf-8") as f:
            f.write(text_content)

    materi = Materi(guru_id=guru.id, judul=judul, file_path=file_path)

    db.add(materi)
    await db.flush()

    chunks = chunk_text(text_content)
    for i, chunk_content in enumerate(chunks):
        chunk = MateriChunk(
            materi_id=materi.id,
            chunk_index=i,
            content=chunk_content,
        )
        db.add(chunk)

    await db.commit()
    await db.refresh(materi)
    return MateriResponse.model_validate(materi)


@router.get("", response_model=list[MateriResponse])
async def list_materi(
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Materi).where(Materi.guru_id == guru.id).order_by(Materi.created_at.desc())
    )
    return [MateriResponse.model_validate(m) for m in result.scalars().all()]


@router.get("/{materi_id}/chunks-count")
async def get_chunks_count(
    materi_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Materi).where(Materi.id == materi_id))
    materi = result.scalar_one_or_none()
    if not materi:
        raise HTTPException(status_code=404, detail="Materi tidak ditemukan")
    if materi.guru_id != guru.id:
        raise HTTPException(status_code=403, detail="Bukan materi Anda")

    chunks = await db.execute(
        select(MateriChunk).where(MateriChunk.materi_id == materi_id)
    )
    return {"count": len(chunks.scalars().all())}


@router.delete("/{materi_id}", status_code=204)
async def delete_materi(
    materi_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Materi).where(Materi.id == materi_id))
    materi = result.scalar_one_or_none()
    if not materi:
        raise HTTPException(status_code=404, detail="Materi tidak ditemukan")
    if materi.guru_id != guru.id:
        raise HTTPException(status_code=403, detail="Bukan materi Anda")

    if materi.file_path and os.path.exists(materi.file_path):
        os.remove(materi.file_path)
        md_path = f"{materi.file_path}.md"
        if os.path.exists(md_path):
            os.remove(md_path)

    await db.execute(
        select(MateriChunk).where(MateriChunk.materi_id == materi_id)
    )
    from sqlalchemy import delete as sql_delete
    await db.execute(
        sql_delete(MateriChunk).where(MateriChunk.materi_id == materi_id)
    )

    await db.delete(materi)
    await db.commit()

