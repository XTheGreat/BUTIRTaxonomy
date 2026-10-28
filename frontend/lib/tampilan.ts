// Pengaturan tampilan. Disimpan di perangkat ini (localStorage) dan diterapkan lewat
// atribut data pada <html> yang dibaca oleh app/globals.css.

export const KUNCI_TAMPILAN = "butir_tampilan";
export const PERISTIWA_TAMPILAN = "tampilan_diubah";

export type UkuranTeks = "kecil" | "normal" | "besar";
export type Tema = "terang" | "gelap";

export interface Tampilan {
  tema: Tema;
  ukuranTeks: UkuranTeks;
  kurangiGerak: boolean;
  kursorKhusus: boolean;
}

export const TAMPILAN_BAWAAN: Tampilan = {
  tema: "terang",
  ukuranTeks: "normal",
  kurangiGerak: false,
  kursorKhusus: false,
};

export const DAFTAR_UKURAN: UkuranTeks[] = ["kecil", "normal", "besar"];

export function bacaTampilan(): Tampilan {
  try {
    const mentah = typeof window === "undefined" ? null : localStorage.getItem(KUNCI_TAMPILAN);
    if (!mentah) return { ...TAMPILAN_BAWAAN };
    const data = JSON.parse(mentah);
    return {
      tema: data?.tema === "gelap" || data?.tema === "terang" ? data.tema : TAMPILAN_BAWAAN.tema,
      ukuranTeks: DAFTAR_UKURAN.includes(data?.ukuranTeks) ? data.ukuranTeks : TAMPILAN_BAWAAN.ukuranTeks,
      kurangiGerak: typeof data?.kurangiGerak === "boolean" ? data.kurangiGerak : TAMPILAN_BAWAAN.kurangiGerak,
      kursorKhusus: typeof data?.kursorKhusus === "boolean" ? data.kursorKhusus : TAMPILAN_BAWAAN.kursorKhusus,
    };
  } catch {
    return { ...TAMPILAN_BAWAAN };
  }
}

export function terapkanTampilan(t: Tampilan): void {
  const html = document.documentElement;
  html.dataset.tema = t.tema;
  html.dataset.ukuranTeks = t.ukuranTeks;
  html.dataset.gerak = t.kurangiGerak ? "kurang" : "biasa";
}

export function simpanTampilan(t: Tampilan): void {
  try {
    localStorage.setItem(KUNCI_TAMPILAN, JSON.stringify(t));
  } catch {}
  terapkanTampilan(t);
  window.dispatchEvent(new Event(PERISTIWA_TAMPILAN));
}

export function hapusTampilan(): void {
  try {
    localStorage.removeItem(KUNCI_TAMPILAN);
  } catch {}
  terapkanTampilan(TAMPILAN_BAWAAN);
  window.dispatchEvent(new Event(PERISTIWA_TAMPILAN));
}
