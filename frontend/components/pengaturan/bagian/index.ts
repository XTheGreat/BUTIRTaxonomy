import type { ComponentType } from "react";
import { CandlestickChart, Languages, Palette, Shield, SlidersHorizontal, User, type LucideIcon } from "lucide-react";
import type { Kamus } from "@/lib/teks";
import Akun from "./Akun";
import Bahasa from "./Bahasa";
import Panduan from "./Panduan";
import Preferensi from "./Preferensi";
import Privasi from "./Privasi";
import Tampilan from "./Tampilan";

export interface DefinisiBagian {
  id: string;
  ikon: LucideIcon;
  label: (kamus: Kamus) => string;
  Komponen: ComponentType;
}

// Registri bagian Pengaturan. Untuk menambah bagian baru: buat komponennya di folder ini,
// tambahkan teks `bagian.<id>` di kamus akun (id dan en), lalu daftarkan di sini.
export const DAFTAR_BAGIAN: DefinisiBagian[] = [
  { id: "akun", ikon: User, label: (k) => k.akun.pengaturan.bagian.akun, Komponen: Akun },
  { id: "bahasa", ikon: Languages, label: (k) => k.akun.pengaturan.bagian.bahasa, Komponen: Bahasa },
  { id: "tampilan", ikon: Palette, label: (k) => k.akun.pengaturan.bagian.tampilan, Komponen: Tampilan },
  { id: "preferensi", ikon: SlidersHorizontal, label: (k) => k.akun.pengaturan.bagian.preferensi, Komponen: Preferensi },
  { id: "privasi", ikon: Shield, label: (k) => k.akun.pengaturan.bagian.privasi, Komponen: Privasi },
  { id: "panduan", ikon: CandlestickChart, label: (k) => k.akun.pengaturan.bagian.panduan, Komponen: Panduan },
];

export const BAGIAN_AWAL = DAFTAR_BAGIAN[0].id;
