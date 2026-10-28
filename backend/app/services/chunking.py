import re

_MIN_KATA_BERMAKNA = 15
_RATA_KATA_DAFTAR = 14
_AKHIR_NOMOR_HALAMAN = re.compile(r"(?:\.{3,}|\s)\d{1,3}$")
_AWAL_JUDUL_BAGIAN = re.compile(
    r"(?:bab|pelajaran|unit|modul|subbab|bagian|lampiran|[ivxl]+\.|\d+(?:\.\d+)*[.)]?)\s", re.I
)
_PENANDA_HALAMAN = re.compile(r"^#{1,6}\s*halaman\s+\d+$", re.I)
_PENANDA_DAFTAR_ISI = re.compile(r"\b(?:daftar\s+isi|table\s+of\s+contents)\b", re.I)


def potongan_bermakna(teks: str) -> bool:
    """False untuk potongan yang bukan isi pelajaran: daftar isi, halaman judul, atau terlalu pendek.

    Soal yang dibuat dari potongan seperti itu menguji struktur dokumen, bukan pengetahuan.
    """
    # Penanda "## Halaman N" disisipkan pengekstrak berkas; bukan isi dan bukan bagian daftar.
    baris = [b.strip() for b in teks.splitlines() if b.strip() and not _PENANDA_HALAMAN.match(b.strip())]
    kata = " ".join(baris).split()
    if len(kata) < _MIN_KATA_BERMAKNA:
        return False

    if len(baris) < 6:
        return True
    rata_kata = len(kata) / len(baris)
    if rata_kata >= _RATA_KATA_DAFTAR:
        return True  # baris panjang = paragraf, bukan daftar

    bernomor = sum(1 for b in baris if _AKHIR_NOMOR_HALAMAN.search(b))
    judul_bagian = sum(1 for b in baris if _AWAL_JUDUL_BAGIAN.match(b))
    berpenanda = bool(_PENANDA_DAFTAR_ISI.search(teks[:240]))
    return not (berpenanda or bernomor / len(baris) >= 0.5 or judul_bagian / len(baris) >= 0.5)


def chunk_text(text: str, max_words: int = 500) -> list[str]:
    paragraphs = text.split("\n\n")
    chunks = []
    current_chunk = []
    current_word_count = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        word_count = len(para.split())

        if current_word_count + word_count > max_words and current_chunk:
            chunks.append("\n\n".join(current_chunk))
            current_chunk = [para]
            current_word_count = word_count
        else:
            current_chunk.append(para)
            current_word_count += word_count

    if current_chunk:
        chunks.append("\n\n".join(current_chunk))

    if not chunks:
        chunks = [text.strip()]

    return chunks
