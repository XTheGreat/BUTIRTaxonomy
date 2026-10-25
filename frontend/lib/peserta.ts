const NAMA_HEADER = "X-Peserta-Token";

function kunciPenyimpanan(kodeAkses: string, nama: string): string {
  return `butir_peserta:${kodeAkses}:${nama.split(/\s+/).filter(Boolean).join(" ").toLowerCase()}`;
}

export function ambilToken(kodeAkses: string, nama: string): string | null {
  try {
    return localStorage.getItem(kunciPenyimpanan(kodeAkses, nama));
  } catch {
    return null;
  }
}

export function simpanToken(kodeAkses: string, nama: string, token: string): void {
  try {
    localStorage.setItem(kunciPenyimpanan(kodeAkses, nama), token);
  } catch {
  }
}

export function headerPeserta(kodeAkses: string, nama: string): Record<string, string> {
  const token = ambilToken(kodeAkses, nama);
  return token ? { [NAMA_HEADER]: token } : {};
}
