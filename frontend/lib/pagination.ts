export type NomorHalaman = number | `ellipsis-${number}`;

export function susunNomorHalaman(aktif: number, total: number): NomorHalaman[] {
  if (total <= 7) return Array.from({ length: total }, (_, indeks) => indeks + 1);

  let nomor: number[];
  if (aktif <= 4) {
    nomor = [1, 2, 3, 4, 5, total];
  } else if (aktif >= total - 3) {
    nomor = [1, total - 4, total - 3, total - 2, total - 1, total];
  } else {
    nomor = [1, aktif - 2, aktif - 1, aktif, aktif + 1, aktif + 2, total];
  }

  const hasil: NomorHalaman[] = [];
  let sebelumnya = 0;
  for (const nilai of [...new Set(nomor)].sort((a, b) => a - b)) {
    if (nilai - sebelumnya === 2) hasil.push(sebelumnya + 1);
    else if (nilai - sebelumnya > 2) hasil.push(`ellipsis-${sebelumnya}`);
    hasil.push(nilai);
    sebelumnya = nilai;
  }
  return hasil;
}
