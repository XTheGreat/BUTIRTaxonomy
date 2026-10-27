// Kode galat milik kelompok router Ujian dan Paket. Semua kunci wajib berawalan nama routernya.
type P = Record<string, unknown>;

const galatUjian = {
  ujian_tidak_ditemukan: "Ujian tidak ditemukan",
  ujian_bukan_milik_anda: "Bukan ujian Anda",
  ujian_butir_tidak_ditemukan: (p: P) => `Butir ${p.id} tidak ditemukan`,
  ujian_butir_belum_diterima: (p: P) => `Butir ${p.id} belum diterima`,
  ujian_format_ekspor_tidak_valid: "Format ekspor harus pdf atau docx",
  ujian_peserta_tidak_ditemukan: "Peserta tidak ditemukan",
  ujian_belum_diterbitkan: "Ujian belum diterbitkan",
  ujian_rilis_otomatis: "Ujian ini memakai rilis otomatis: siswa melihat hasil begitu mengumpulkan",
  ujian_sudah_diterbitkan: "Ujian ini sudah diterbitkan",
  ujian_waktu_selesai_sebelum_mulai: "Waktu selesai harus setelah waktu mulai",
  paket_pilihan_tidak_valid: (p: P) => `Paket harus salah satu dari: ${p.daftar}`,
  paket_pengguna_tidak_ditemukan: "Pengguna tidak ditemukan",
  paket_kuota_soal_institusi: (p: P) =>
    `Kuota soal institusi ${p.institusi} bulan ini tinggal ${p.sisa} dari ${p.batas}, sedangkan kisi-kisi ini meminta ${p.jumlah}. Kurangi jumlah butir atau hubungi admin institusi.`,
  paket_kuota_soal_paket: (p: P) =>
    `Kuota soal paket ${p.paket} bulan ini tinggal ${p.sisa} dari ${p.batas}, sedangkan kisi-kisi ini meminta ${p.jumlah}. Kurangi jumlah butir atau upgrade ke paket Pro.`,
  paket_kuota_materi: (p: P) =>
    `Paket ${p.paket} dibatasi ${p.batas} materi ajar. Hapus materi yang tidak dipakai atau upgrade ke paket Pro.`,
  paket_ekspor_butuh_pro: "Ekspor PDF dan DOCX tersedia di paket Pro. Upgrade untuk memakai fitur ini.",
};

export default galatUjian;
