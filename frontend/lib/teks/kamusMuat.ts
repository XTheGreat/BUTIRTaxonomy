import { id, type Bahasa, type Kamus } from "./kamus";

const pemuat: Record<Exclude<Bahasa, "id">, () => Promise<Kamus>> = {
  en: () => import("./kamusEn").then((m) => m.en),
  zh: () => import("./kamusZh").then((m) => m.zh),
};

const terisi: Partial<Record<Bahasa, Kamus>> = { id };
const berjalan: Partial<Record<Bahasa, Promise<Kamus>>> = {};

/** Kamus yang sudah ada di memori, atau undefined bila belum pernah dimuat. */
export function kamusTersedia(b: Bahasa): Kamus | undefined {
  return terisi[b];
}

/** Judul bawaan situs untuk semua bahasa yang sudah dimuat (dipakai mengenali judul bawaan). */
export function judulSitusDikenal(): string[] {
  return Object.values(terisi).map((k) => (k as Kamus).umum.judulSitus);
}

/** Memuat kamus satu bahasa (sekali saja); bahasa bawaan selalu langsung tersedia. */
export function muatKamus(b: Bahasa): Promise<Kamus> {
  const ada = terisi[b];
  if (ada) return Promise.resolve(ada);
  const sedang = berjalan[b];
  if (sedang) return sedang;
  const janji = pemuat[b as Exclude<Bahasa, "id">]().then(
    (k) => {
      terisi[b] = k;
      return k;
    },
    (galat) => {
      // Gagal (mis. jaringan putus): izinkan percobaan ulang pada pemilihan berikutnya.
      delete berjalan[b];
      throw galat;
    },
  );
  berjalan[b] = janji;
  return janji;
}
