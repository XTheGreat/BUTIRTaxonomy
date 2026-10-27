import idAkun from "./id/akun";
import idAuth from "./id/auth";
import idDashboard from "./id/dashboard";
import idGalat from "./id/galat";
import idInfo from "./id/info";
import idKomponen from "./id/komponen";
import idPersiapan from "./id/persiapan";
import idShell from "./id/shell";
import idSistem from "./id/sistem";
import idTelaah from "./id/telaah";
import idUjian from "./id/ujian";
import idUmum from "./id/umum";

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

// Satu berkas per area agar beberapa orang/sesi bisa menerjemahkan bersamaan
// tanpa saling menimpa. Bentuk `en` dipaksa sama dengan `id` oleh tipenya.
export const id = {
  akun: idAkun,
  auth: idAuth,
  dashboard: idDashboard,
  galat: idGalat,
  info: idInfo,
  komponen: idKomponen,
  persiapan: idPersiapan,
  shell: idShell,
  sistem: idSistem,
  telaah: idTelaah,
  ujian: idUjian,
  umum: idUmum,
};

export type Kamus = typeof id;

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

export const kamusPerBahasa = { id, en } as const;

export type Bahasa = keyof typeof kamusPerBahasa;

export const daftarBahasa: Bahasa[] = ["id", "en"];
export const bahasaBawaan: Bahasa = "id";
