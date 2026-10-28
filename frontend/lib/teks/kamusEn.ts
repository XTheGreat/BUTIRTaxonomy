import type { Kamus } from "./kamus";
import enAkun from "./en/akun";
import enAuth from "./en/auth";
import enDashboard from "./en/dashboard";
import enGalat from "./en/galat";
import enInfo from "./en/info";
import enKomponen from "./en/komponen";
import enPersiapan from "./en/persiapan";
import enShell from "./en/shell";
import enSistem from "./en/sistem";
import enTelaah from "./en/telaah";
import enUjian from "./en/ujian";
import enUmum from "./en/umum";

// Dimuat secara dinamis oleh kamusMuat.ts; jangan diimpor langsung dari kode aplikasi.
export const en: Kamus = {
  akun: enAkun,
  auth: enAuth,
  dashboard: enDashboard,
  galat: enGalat,
  info: enInfo,
  komponen: enKomponen,
  persiapan: enPersiapan,
  shell: enShell,
  sistem: enSistem,
  telaah: enTelaah,
  ujian: enUjian,
  umum: enUmum,
};
