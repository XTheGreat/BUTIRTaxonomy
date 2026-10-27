import { bahasaAktifSekarang } from "./aktif";
import { kamusPerBahasa } from "./kamus";

type Param = Record<string, unknown>;

// Mengubah kode error dari API menjadi teks dalam bahasa aktif.
// Mengembalikan null bila kode tidak dikenal, agar pemanggil memakai pesan cadangan dari server.
export function terjemahkanGalat(kode?: string, param: Param = {}): string | null {
  if (!kode) return null;
  const kamus = kamusPerBahasa[bahasaAktifSekarang()].galat as Record<string, unknown>;
  const entri = kamus[kode];
  if (typeof entri === "string") return entri;
  if (typeof entri === "function") return (entri as (p: Param) => string)(param);
  return null;
}
