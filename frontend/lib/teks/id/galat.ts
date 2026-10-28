import galatSiswa from "./galatSiswa";
import galatUjian from "./galatUjian";
import galatInstitusi from "./galatInstitusi";
import galatMateri from "./galatMateri";

// Kunci = `kode` dari backend (`app/core/galat.py`). Nilai berupa string, atau fungsi
// bila kalimatnya memakai `param` dari server, mis. `(p) => \`Kursi penuh (${p.kursi})\``.
type Param = Record<string, unknown>;

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
  akun_password_salah: "Kata sandi saat ini salah",
  akun_password_sama: "Kata sandi baru harus berbeda dari yang lama",
  // Error validasi Pydantic (backend `galat_validasi`): dibaca dari `type` dan `ctx` respons 422.
  validasi_sandi_pendek: "Kata sandi minimal 8 karakter",
  validasi_sandi_huruf_angka: "Kata sandi harus memuat huruf dan angka",
  validasi_sandi_panjang: "Kata sandi terlalu panjang (maksimal 72 byte)",
  validasi_pertanyaan_kosong: "Pertanyaan tidak boleh kosong",
  validasi_pilihan_tidak_lengkap: "Pilihan harus berisi opsi A, B, C, dan D yang terisi",
  validasi_kunci_tidak_valid: "Kunci jawaban harus A, B, C, atau D",
  validasi_bloom_tidak_valid: "Level Bloom tidak valid",
  validasi_bobot_tidak_valid: "Bobot poin harus antara 1 dan 100",
  validasi_status_tidak_valid: "Status tidak valid",
  validasi_kisi_bloom_tidak_valid: (p: Param) => `Level Bloom tidak valid: ${p.key}`,
  validasi_kisi_persen_negatif: (p: Param) => `Persentase ${p.key} tidak boleh negatif`,
  validasi_kisi_total_bloom: (p: Param) => `Total distribusi Bloom harus 100%, saat ini ${p.total}%`,
  validasi_siswa_nama_kosong: "Nama tidak boleh kosong",
  validasi_nama_kosong: "Nama tidak boleh kosong",
  validasi_nama_panjang: "Nama terlalu panjang (maksimal 255 karakter)",
  validasi_nama_tidak_pantas: "Nama tidak boleh berisi kata kasar. Gunakan nama yang sesuai.",
  validasi_ujian_total_bloom: "Total distribusi Bloom harus 100%",
  validasi_ujian_bloom_tidak_valid: "Level Bloom tidak valid",
  validasi_ujian_persen_negatif: "Persentase Bloom tidak boleh negatif",
  ...galatSiswa,
  ...galatUjian,
  ...galatInstitusi,
  ...galatMateri,
};

export default galat;
