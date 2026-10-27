// Preferensi kerja pengajar. Disimpan di perangkat ini (localStorage), bukan di server,
// dan dipakai sebagai nilai awal formulir kisi-kisi dan rakit ujian.

export const KUNCI_PREFERENSI = "butir_preferensi";

export const LEVEL_BLOOM = ["C1", "C2", "C3", "C4", "C5", "C6"] as const;

export interface Preferensi {
  jumlahButir: number;
  durasiMenit: number;
  distribusiBloom: Record<string, number>;
}

export const BATAS = {
  jumlahButir: { min: 1, max: 50 },
  durasiMenit: { min: 5, max: 240 },
} as const;

export const PREFERENSI_BAWAAN: Preferensi = {
  jumlahButir: 5,
  durasiMenit: 60,
  distribusiBloom: { C1: 0, C2: 20, C3: 30, C4: 30, C5: 20, C6: 0 },
};

function dalamBatas(nilai: unknown, min: number, max: number, cadangan: number): number {
  return typeof nilai === "number" && Number.isInteger(nilai) && nilai >= min && nilai <= max ? nilai : cadangan;
}

export function totalBloom(distribusi: Record<string, number>): number {
  return LEVEL_BLOOM.reduce((jumlah, level) => jumlah + (distribusi[level] || 0), 0);
}

export function bacaPreferensi(): Preferensi {
  const bawaan = PREFERENSI_BAWAAN;
  try {
    const mentah = typeof window === "undefined" ? null : localStorage.getItem(KUNCI_PREFERENSI);
    if (!mentah) return { ...bawaan, distribusiBloom: { ...bawaan.distribusiBloom } };
    const data = JSON.parse(mentah);
    const bloom: Record<string, number> = {};
    for (const level of LEVEL_BLOOM) {
      bloom[level] = dalamBatas(data?.distribusiBloom?.[level], 0, 100, bawaan.distribusiBloom[level]);
    }
    return {
      jumlahButir: dalamBatas(data?.jumlahButir, BATAS.jumlahButir.min, BATAS.jumlahButir.max, bawaan.jumlahButir),
      durasiMenit: dalamBatas(data?.durasiMenit, BATAS.durasiMenit.min, BATAS.durasiMenit.max, bawaan.durasiMenit),
      // Distribusi yang tak berjumlah 100 dianggap rusak dan diganti bawaan.
      distribusiBloom: totalBloom(bloom) === 100 ? bloom : { ...bawaan.distribusiBloom },
    };
  } catch {
    return { ...bawaan, distribusiBloom: { ...bawaan.distribusiBloom } };
  }
}

export function simpanPreferensi(p: Preferensi): void {
  try {
    localStorage.setItem(KUNCI_PREFERENSI, JSON.stringify(p));
  } catch {}
}

export function hapusPreferensi(): void {
  try {
    localStorage.removeItem(KUNCI_PREFERENSI);
  } catch {}
}
