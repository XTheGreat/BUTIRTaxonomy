// Kunci = `kode` dari backend (`app/core/galat.py`). Nilai berupa string, atau fungsi
// bila kalimatnya memakai `param` dari server, mis. `(p) => \`Kursi penuh (${p.kursi})\``.
const galat = {
  email_sudah_terdaftar: "Email sudah terdaftar",
  kredensial_salah: "Email atau kata sandi salah",
  tautan_reset_tidak_valid: "Tautan reset tidak valid, sudah dipakai, atau kedaluwarsa",
  masuk_google_gagal: "Masuk dengan Google gagal. Coba lagi.",
  kode_baru_dikirim: "Kode baru saja dikirim. Tunggu sebentar sebelum meminta lagi.",
  kode_terlalu_sering: "Terlalu banyak permintaan kode. Coba lagi dalam satu jam.",
  kode_salah: "Kode salah atau sudah kedaluwarsa",
  token_tidak_valid: "Token tidak valid atau kedaluwarsa",
  sesi_berakhir: "Sesi telah berakhir, silakan masuk kembali",
  pengguna_tidak_ditemukan: "Pengguna tidak ditemukan",
  hanya_admin: "Hanya admin yang dapat mengakses ini",
};

export default galat;
