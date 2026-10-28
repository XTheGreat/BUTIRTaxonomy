import type galatMateriId from "../id/galatMateri";

const galatMateri: typeof galatMateriId = {
  // materi
  materi_format_tidak_didukung: "Unsupported file format. Use PDF, DOCX, TXT, or MD.",
  materi_berkas_terlalu_besar: (p) => `File size exceeds the ${p.batas_mb} MB limit.`,
  materi_berkas_ditolak: (p) => p.alasan,
  materi_gagal_memproses_berkas: (p) => `Failed to process ${p.format} file: ${p.e}`,
  materi_berkas_tanpa_teks: "The file has no text content that can be processed.",
  materi_tidak_ditemukan: "Material not found",
  materi_bukan_milik_guru: "This is not your material",

  // kisi_kisi
  kisi_kisi_tidak_ditemukan: "Blueprint not found",
  kisi_kisi_bukan_milik_guru: "This is not your blueprint",
  kisi_kisi_sudah_dijalankan: (p) => {
    const tindakan = p.tindakan === "dihapus" ? "deleted" : p.tindakan === "diubah" ? "edited" : p.tindakan;
    return `This blueprint has already been run and cannot be ${tindakan}. Create a new blueprint.`;
  },
  kisi_kisi_materi_tidak_ditemukan: (p) => `Material ${p.materi_id} not found`,

  // generasi
  generasi_kisi_kisi_tidak_ditemukan: "Blueprint not found",
  generasi_bukan_kisi_kisi_guru: "This is not your blueprint",
  generasi_sudah_dijalankan: "Generation for this blueprint has already been run",

  // bank_soal
  bank_soal_butir_tidak_ditemukan: "Item not found",
  bank_soal_butir_dipakai_ujian_aktif: "This item is used in an active exam and cannot be deleted",
  bank_soal_format_ekspor_tidak_valid: "Export format must be json, txt, pdf, or docx",
  bank_soal_daftar_id_tidak_valid: "The item id list is invalid",

  // butir
  butir_tidak_ditemukan: "Item not found",
  butir_bukan_milik_guru: "This is not your item",
  butir_tidak_ada_tertunda: "There are no pending items to retry",
  butir_bukan_tertunda: "Only items with pending status can be retried",
  butir_tidak_sedang_diproses: "This item is not being processed",
  butir_masih_diproses_debat: "This item is still in debate processing and cannot be edited yet",
  butir_belum_lengkap: "The item is incomplete: the question, options, and answer key must be valid",

  // arsip
  arsip_butir_tidak_ditemukan: "Item not found",
  arsip_butir_belum_terminal: "A question can only be archived from Accepted History or Rejected History.",
  arsip_ronde_final_tidak_bisa_diarsipkan: "The final accepted or rejected round cannot be archived.",
  arsip_ronde_sudah_di_bank_soal:
    "The round that produced the accepted item cannot be archived because it is already in the Question Bank.",
  arsip_soal_ronde_tidak_ditemukan: "The question for this round was not found",
  arsip_ronde_bukan_revisi: "Only revision rounds before the final round can be archived.",
  arsip_soal_sudah_diarsipkan: "The question for this round is already in the Archive.",
  arsip_soal_tidak_ditemukan: "Archived question not found",
  arsip_soal_dipakai_paket_ujian: "This question is already used in an exam package and cannot be deleted.",
};

export default galatMateri;
