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

// Hanya kamus Indonesia (bahasa bawaan) yang ikut dalam JavaScript awal. English (kamusEn.ts)
// dan Mandarin (kamusZh.ts) dimuat saat dipilih lewat kamusMuat.ts, agar halaman pertama
// tidak mengunduh dua bahasa yang belum tentu dipakai.
//
// Satu berkas per area agar beberapa orang/sesi bisa menerjemahkan bersamaan
// tanpa saling menimpa. Bentuk bahasa lain dipaksa sama dengan `id` oleh tipenya.
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

export type Bahasa = "id" | "en" | "zh";

export const daftarBahasa: Bahasa[] = ["id", "en", "zh"];
export const bahasaBawaan: Bahasa = "id";
