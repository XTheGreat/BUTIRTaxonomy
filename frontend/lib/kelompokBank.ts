export const ID_TANPA_KELOMPOK = "tanpa-kelompok";

export interface KelompokBank {
  id: string;
  nama: string | null;
  label: string;
  urutan: number;
  created_at: string;
  jumlah_diterima: number;
}

export interface GrupButir<T> {
  kelompok: KelompokBank;
  butir: T[];
}

export function kelompokkan<T extends { kisi_kisi_id: string; created_at: string }>(
  butir: T[],
  kelompok: KelompokBank[]
): GrupButir<T>[] {
  const urut = (a: T, b: T) => a.created_at.localeCompare(b.created_at);
  const hasil: GrupButir<T>[] = kelompok
    .map((k) => ({ kelompok: k, butir: butir.filter((b) => b.kisi_kisi_id === k.id).sort(urut) }))
    .filter((g) => g.butir.length > 0);

  const dikenal = new Set(kelompok.map((k) => k.id));
  const sisa = butir.filter((b) => !dikenal.has(b.kisi_kisi_id)).sort(urut);
  if (sisa.length > 0) {
    hasil.push({
      kelompok: {
        id: ID_TANPA_KELOMPOK,
        nama: null,
        label: "Tanpa kelompok",
        urutan: 0,
        created_at: sisa[0].created_at,
        jumlah_diterima: sisa.length,
      },
      butir: sisa,
    });
  }
  return hasil;
}
