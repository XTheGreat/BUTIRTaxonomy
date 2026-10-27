// Kode galat milik kelompok router Institusi. Semua kunci wajib berawalan nama routernya.
const galatInstitusi = {
  institusi_tidak_ditemukan: "Institusi tidak ditemukan",
  institusi_akun_belum_terdaftar: "Akun dengan email itu belum terdaftar. Minta guru mendaftar dulu.",
  institusi_akun_sudah_anggota_lain: "Akun itu sudah menjadi anggota institusi lain",
  institusi_akun_sudah_anggota_ini: "Akun itu sudah menjadi anggota institusi ini",
  institusi_kursi_kurang_dari_anggota: "Kursi tidak boleh kurang dari jumlah anggota saat ini",
  institusi_hanya_admin_tambah_anggota: "Hanya admin institusi yang dapat menambah anggota",
  institusi_lisensi_tidak_aktif: "Lisensi institusi tidak aktif",
  institusi_kursi_penuh: (p: Record<string, unknown>) =>
    `Kursi penuh (${p.kursi}). Tambah kursi lisensi untuk menambah anggota.`,
  institusi_hanya_admin_keluarkan_anggota: "Hanya admin institusi yang dapat mengeluarkan anggota",
  institusi_anggota_tidak_ditemukan: "Anggota tidak ditemukan di institusi ini",
  institusi_admin_hanya_oleh_admin_sistem: "Admin institusi hanya dapat dikeluarkan oleh admin sistem",
  marketplace_soal_arsip_tak_dijual: "Soal dari Arsip tidak boleh dijual di Marketplace.",
  marketplace_butir_tak_boleh_dijual:
    "Hanya butir berstatus diterima milik Anda yang boleh dijual. Periksa kembali pilihan butir.",
  marketplace_listing_tidak_ditemukan: "Listing tidak ditemukan",
  marketplace_listing_tidak_dijual: "Listing tidak ditemukan atau sudah tidak dijual",
  marketplace_beli_milik_sendiri: "Anda tidak dapat membeli bank soal milik sendiri",
  marketplace_sudah_dibeli: "Anda sudah membeli atau sedang memproses pembelian bank soal ini",
  marketplace_transaksi_tidak_ditemukan: "Transaksi tidak ditemukan",
  marketplace_transaksi_sudah_berstatus: (p: Record<string, unknown>) => `Transaksi sudah berstatus ${p.status}`,
};

export default galatInstitusi;
