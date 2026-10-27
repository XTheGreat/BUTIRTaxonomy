import type { Kamus } from "@/lib/teks";

export interface PenyebabRamah {
  judul: string;
  saran: string | null;
}

export function ringkasPenyebab(
  alasan: string | null | undefined,
  t: Kamus["telaah"]["penyebab"],
): PenyebabRamah {
  const s = (alasan || "").trim();
  if (!s) return { judul: t.tidakTercatat, saran: t.saranUlangiButir };
  const k = s.toLowerCase();

  if (k.includes("dihentikan oleh guru")) {
    return { judul: t.dihentikanAnda, saran: t.saranUlangiBilaLanjut };
  }
  if (k.includes("server dimulai ulang")) {
    return { judul: t.serverMulaiUlang, saran: t.saranUlangiButirIni };
  }
  if (k.includes("melebihi batas waktu") || k.includes("timeout")) {
    return { judul: t.terlaluLama, saran: t.saranCobaLagi };
  }
  if (/http (402|403)|menolak permintaan|saldo|kuota|payment|insufficient/.test(k)) {
    return { judul: t.saldoBermasalah, saran: t.saranHubungiAdminSaldo };
  }
  if (k.includes("http 401")) {
    return { judul: t.kunciTidakValid, saran: t.saranHubungiAdmin };
  }
  if (k.includes("http 429") || k.includes("rate limit")) {
    return { judul: t.membatasiPermintaan, saran: t.saranTungguLalu };
  }
  if (k.includes("terpotong")) {
    return { judul: t.jawabanTerpotong, saran: t.saranUlangiButirIni };
  }
  if (k.includes("json") || k.includes("skema")) {
    return { judul: t.formatTidakSesuai, saran: t.saranUlangiButirIni };
  }
  if (/http 5\d\d|connect|jaringan|network|read error|remote/.test(k)) {
    return { judul: t.tidakDapatDihubungi, saran: t.saranCobaLagi };
  }
  return { judul: t.gagalUmum, saran: t.saranUlangiAtauAdmin };
}
