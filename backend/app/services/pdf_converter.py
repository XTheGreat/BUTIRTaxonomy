import io
import re
import logging
from pypdf import PdfReader

logger = logging.getLogger(__name__)


def clean_pdf_text(raw_text: str) -> str:
    if not raw_text:
        return ""

    lines = raw_text.splitlines()
    cleaned_lines = []
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            cleaned_lines.append("")
            continue

        stripped = re.sub(r"^[\u2022\u2023\u25E6\u2043\u2219\u25AA\u25AB\uF0B7]\s*", "- ", stripped)
        
        if (
            len(stripped) < 80 
            and not stripped.startswith("-") 
            and not re.match(r"^\d+\.", stripped)
            and (
                re.match(r"^(BAB\s+[IVXLCDM0-9]+|PASAL\s+[0-9]+|BAGIAN\s+[0-9]+)", stripped, re.IGNORECASE)
                or (stripped.isupper() and len(stripped.split()) <= 8)
            )
        ):
            stripped = f"### {stripped}"

        cleaned_lines.append(stripped)

    text = "\n".join(cleaned_lines)

    text = re.sub(r"(\b\w+)-\n(\w+\b)", r"\1\2", text)

    paragraphs = []
    current_para = []

    for line in text.splitlines():
        trimmed = line.strip()
        if not trimmed:
            if current_para:
                paragraphs.append(" ".join(current_para))
                current_para = []
            continue

        if trimmed.startswith(("#", "-", "*", ">")) or re.match(r"^\d+\.\s+", trimmed):
            if current_para:
                paragraphs.append(" ".join(current_para))
                current_para = []
            paragraphs.append(trimmed)
        else:
            current_para.append(trimmed)

    if current_para:
        paragraphs.append(" ".join(current_para))

    return "\n\n".join(paragraphs)


def convert_pdf_to_markdown(pdf_bytes: bytes, filename: str = "") -> str:
    stream = io.BytesIO(pdf_bytes)
    try:
        reader = PdfReader(stream)
    except Exception as e:
        raise ValueError(f"Berkas PDF tidak valid atau rusak: {e}")

    total_pages = len(reader.pages)
    if total_pages == 0:
        raise ValueError("Berkas PDF tidak memiliki halaman.")

    md_sections = []
    
    metadata = reader.metadata
    title = metadata.title if metadata and metadata.title else None
    if title and title.strip():
        md_sections.append(f"# {title.strip()}\n")
    elif filename:
        clean_name = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ")
        md_sections.append(f"# {clean_name}\n")

    total_extracted_chars = 0

    for page_idx, page in enumerate(reader.pages, start=1):
        try:
            page_text = page.extract_text() or ""
        except Exception as e:
            logger.warning(f"Gagal mengekstrak teks halaman {page_idx}: {e}")
            page_text = ""

        page_md = clean_pdf_text(page_text)
        if page_md.strip():
            total_extracted_chars += len(page_md.strip())
            md_sections.append(f"## Halaman {page_idx}\n\n{page_md}")

    if total_extracted_chars < 20:
        raise ValueError(
            "Berkas PDF tidak memiliki teks yang dapat diekstrak (kemungkinan berupa pindaian gambar/scan murni). "
            "Harap unggah PDF berbasis teks atau salin teks ke berkas .txt / .md."
        )

    return "\n\n".join(md_sections)
