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
  ...galatSiswa,
  ...galatUjian,
  ...galatInstitusi,
  ...galatMateri,
};

export default galat;
