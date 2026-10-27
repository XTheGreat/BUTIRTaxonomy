import type galatId from "../id/galat";
import galatSiswa from "./galatSiswa";
import galatUjian from "./galatUjian";
import galatInstitusi from "./galatInstitusi";
import galatMateri from "./galatMateri";

const galat: typeof galatId = {
  email_sudah_terdaftar: "This email is already registered",
  kredensial_salah: "Incorrect email or password",
  tautan_reset_tidak_valid: "The reset link is invalid, already used, or expired",
  masuk_google_gagal: "Google sign-in failed. Please try again.",
  kode_baru_dikirim: "A code was just sent. Please wait a moment before requesting another.",
  kode_terlalu_sering: "Too many code requests. Please try again in an hour.",
  kode_salah: "The code is incorrect or has expired",
  token_tidak_valid: "Your session token is invalid or has expired",
  sesi_berakhir: "Your session has ended, please sign in again",
  pengguna_tidak_ditemukan: "User not found",
  hanya_admin: "Only admins can access this",
  akun_password_salah: "The current password is incorrect",
  akun_password_sama: "The new password must be different from the current one",
  // Error validasi Pydantic (backend `galat_validasi`): dibaca dari `type` dan `ctx` respons 422.
  validasi_sandi_pendek: "Password must be at least 8 characters",
  validasi_sandi_huruf_angka: "Password must contain letters and numbers",
  validasi_sandi_panjang: "Password is too long (maximum 72 bytes)",
  validasi_pertanyaan_kosong: "The question cannot be empty",
  validasi_pilihan_tidak_lengkap: "Options A, B, C, and D must all be filled in",
  validasi_kunci_tidak_valid: "The answer key must be A, B, C, or D",
  validasi_bloom_tidak_valid: "Invalid Bloom level",
  validasi_bobot_tidak_valid: "Point weight must be between 1 and 100",
  validasi_status_tidak_valid: "Invalid status",
  validasi_kisi_bloom_tidak_valid: (p) => `Invalid Bloom level: ${p.key}`,
  validasi_kisi_persen_negatif: (p) => `The percentage for ${p.key} cannot be negative`,
  validasi_kisi_total_bloom: (p) => `The Bloom distribution must total 100%, currently ${p.total}%`,
  validasi_siswa_nama_kosong: "Name cannot be empty",
  validasi_nama_kosong: "Name cannot be empty",
  validasi_nama_panjang: "Name is too long (maximum 255 characters)",
  validasi_ujian_total_bloom: "The Bloom distribution must total 100%",
  validasi_ujian_bloom_tidak_valid: "Invalid Bloom level",
  validasi_ujian_persen_negatif: "The Bloom percentage cannot be negative",
  ...galatSiswa,
  ...galatUjian,
  ...galatInstitusi,
  ...galatMateri,
};

export default galat;
