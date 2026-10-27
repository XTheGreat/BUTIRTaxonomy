// Kode galat milik kelompok router Materi. Semua kunci wajib berawalan nama routernya.
const galatMateri = {
  // materi
  materi_format_tidak_didukung: "Format berkas tidak didukung. Gunakan PDF, DOCX, TXT, atau MD.",
  materi_berkas_terlalu_besar: (p: { batas_mb: number }) => `Ukuran berkas melebihi batas ${p.batas_mb} MB.`,
  materi_berkas_ditolak: (p: { alasan: string }) => p.alasan,
  materi_gagal_memproses_berkas: (p: { format: string; e: string }) => `Gagal memproses berkas ${p.format}: ${p.e}`,
  materi_berkas_tanpa_teks: "Berkas tidak memiliki isi teks yang dapat diproses.",
  materi_tidak_ditemukan: "Materi tidak ditemukan",
  materi_bukan_milik_guru: "Bukan materi Anda",

  // kisi_kisi
  kisi_kisi_tidak_ditemukan: "Kisi-kisi tidak ditemukan",
  kisi_kisi_bukan_milik_guru: "Bukan kisi-kisi Anda",
  kisi_kisi_sudah_dijalankan: (p: { tindakan: string }) =>
    `Kisi-kisi ini sudah dijalankan dan tidak bisa ${p.tindakan}. Buat kisi-kisi baru.`,
  kisi_kisi_materi_tidak_ditemukan: (p: { materi_id: string }) => `Materi ${p.materi_id} tidak ditemukan`,

  // generasi
  generasi_kisi_kisi_tidak_ditemukan: "Kisi-kisi tidak ditemukan",
  generasi_bukan_kisi_kisi_guru: "Bukan kisi-kisi Anda",
  generasi_sudah_dijalankan: "Generasi untuk kisi-kisi ini sudah pernah dijalankan",

  // bank_soal
  bank_soal_butir_tidak_ditemukan: "Butir tidak ditemukan",
  bank_soal_butir_dipakai_ujian_aktif: "Butir sedang dipakai dalam ujian yang aktif dan tidak bisa dihapus",
  bank_soal_format_ekspor_tidak_valid: "Format ekspor harus json, txt, pdf, atau docx",
  bank_soal_daftar_id_tidak_valid: "Daftar id butir tidak valid",

  // butir
  butir_tidak_ditemukan: "Butir tidak ditemukan",
  butir_bukan_milik_guru: "Bukan butir Anda",
  butir_tidak_ada_tertunda: "Tidak ada butir tertunda untuk diulang",
  butir_bukan_tertunda: "Hanya butir berstatus tertunda yang bisa diulang",
  butir_tidak_sedang_diproses: "Butir ini tidak sedang diproses",
  butir_masih_diproses_debat: "Butir masih diproses debat dan belum bisa diubah",
  butir_belum_lengkap: "Butir belum lengkap: pertanyaan, pilihan, dan kunci jawaban harus valid",

  // arsip
  arsip_butir_tidak_ditemukan: "Butir tidak ditemukan",
  arsip_butir_belum_diterima: "Soal hanya bisa diarsipkan dari butir yang sudah diterima, lewat Riwayat Diterima.",
  arsip_ronde_sudah_di_bank_soal:
    "Ronde yang menghasilkan butir diterima tidak bisa diarsipkan karena sudah ada di Bank Soal.",
  arsip_soal_ronde_tidak_ditemukan: "Soal pada ronde ini tidak ditemukan",
  arsip_ronde_diterima_arbiter: "Ronde ini diterima Arbiter, jadi tidak bisa diarsipkan.",
  arsip_soal_sudah_diarsipkan: "Soal pada ronde ini sudah ada di Arsip.",
  arsip_soal_tidak_ditemukan: "Soal arsip tidak ditemukan",
  arsip_soal_dipakai_paket_ujian: "Soal ini sudah dipakai dalam paket ujian dan tidak bisa dihapus.",
};

export default galatMateri;
