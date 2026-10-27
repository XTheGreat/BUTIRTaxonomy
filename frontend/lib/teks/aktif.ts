import { bahasaBawaan, daftarBahasa, type Bahasa } from "./kamus";

export const KUNCI_BAHASA = "butir_bahasa";

let aktif: Bahasa | null = null;

export function setBahasaAktif(b: Bahasa) {
  aktif = b;
}

// Untuk kode di luar React (mis. lib/api.ts) yang tidak bisa memakai hook.
export function bahasaAktifSekarang(): Bahasa {
  if (aktif) return aktif;
  try {
    const nilai = localStorage.getItem(KUNCI_BAHASA);
    if (daftarBahasa.includes(nilai as Bahasa)) return nilai as Bahasa;
  } catch {}
  return bahasaBawaan;
}
