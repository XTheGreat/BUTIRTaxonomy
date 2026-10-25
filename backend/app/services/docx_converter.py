import io
import re
import zipfile
from xml.etree import ElementTree as ET

_W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
_MAKS_XML_BYTE = 30 * 1024 * 1024


def _teks_paragraf(p: ET.Element) -> str:
    bagian: list[str] = []
    for el in p.iter():
        if el.tag == f"{_W}t" and el.text:
            bagian.append(el.text)
        elif el.tag == f"{_W}tab":
            bagian.append(" ")
        elif el.tag in (f"{_W}br", f"{_W}cr"):
            bagian.append(" ")
    return re.sub(r"\s+", " ", "".join(bagian)).strip()


def _tingkat_judul(p: ET.Element) -> int | None:
    gaya = p.find(f"{_W}pPr/{_W}pStyle")
    if gaya is None:
        return None
    nilai = (gaya.get(f"{_W}val") or "").lower().replace(" ", "")
    if nilai == "title":
        return 1
    cocok = re.fullmatch(r"heading([1-6])", nilai)
    return int(cocok.group(1)) if cocok else None


def convert_docx_to_markdown(docx_bytes: bytes, filename: str = "") -> str:
    try:
        with zipfile.ZipFile(io.BytesIO(docx_bytes)) as arsip:
            try:
                info = arsip.getinfo("word/document.xml")
            except KeyError:
                raise ValueError("Berkas DOCX tidak valid: isi dokumen tidak ditemukan.")
            if info.file_size > _MAKS_XML_BYTE:
                raise ValueError("Isi berkas DOCX terlalu besar untuk diproses.")
            xml_bytes = arsip.read(info)
    except zipfile.BadZipFile:
        raise ValueError("Berkas DOCX tidak valid atau rusak.")

    try:
        akar = ET.fromstring(xml_bytes)
    except ET.ParseError as e:
        raise ValueError(f"Berkas DOCX tidak dapat dibaca: {e}")

    blok: list[str] = []
    for p in akar.iter(f"{_W}p"):
        teks = _teks_paragraf(p)
        if not teks:
            continue
        tingkat = _tingkat_judul(p)
        if tingkat:
            teks = f"{'#' * min(tingkat + 1, 6)} {teks}"
        elif p.find(f"{_W}pPr/{_W}numPr") is not None:
            teks = f"- {teks}"
        blok.append(teks)

    if sum(len(b) for b in blok) < 20:
        raise ValueError("Berkas DOCX tidak memiliki teks yang dapat diekstrak.")

    judul = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").strip()
    if judul:
        blok.insert(0, f"# {judul}")
    return "\n\n".join(blok)
