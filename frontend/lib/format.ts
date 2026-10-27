import { useBahasa, type Bahasa } from "@/lib/teks";
import { bahasaAktifSekarang } from "@/lib/teks/aktif";

const LOKAL: Record<Bahasa, string> = { id: "id-ID", en: "en-US", zh: "zh-CN" };

// Tanpa argumen `bahasa`, memakai bahasa aktif saat ini, sehingga pemanggil lama ikut berganti bahasa.
export function formatWaktu(iso: string | null, bahasa: Bahasa = bahasaAktifSekarang()): string {
  if (!iso) return "-";
  const utc = /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`;
  return new Date(utc).toLocaleString(LOKAL[bahasa], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatAngka(n: number, bahasa: Bahasa = bahasaAktifSekarang()): string {
  return n.toLocaleString(LOKAL[bahasa]);
}

/** Pemformat yang mengikuti bahasa aktif; untuk dipakai di komponen. */
export function useFormat() {
  const { bahasa } = useBahasa();
  return {
    waktu: (iso: string | null) => formatWaktu(iso, bahasa),
    angka: (n: number) => formatAngka(n, bahasa),
    rupiah: (n: number) => `Rp${formatAngka(n, bahasa)}`,
  };
}
