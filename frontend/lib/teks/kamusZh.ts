import type { Kamus } from "./kamus";
import { en } from "./kamusEn";
import terjemahanZh from "./zh";

function gabungTerjemahan(dasar: unknown, terjemahan: unknown): unknown {
  if (!terjemahan || typeof terjemahan !== "object" || Array.isArray(terjemahan)) return terjemahan;
  if (!dasar || typeof dasar !== "object" || Array.isArray(dasar)) return terjemahan;
  const dasarObjek = dasar as Record<string, unknown>;
  const hasil: Record<string, unknown> = { ...dasarObjek };
  for (const [kunci, nilai] of Object.entries(terjemahan as Record<string, unknown>)) {
    const nilaiDasar = dasarObjek[kunci];
    hasil[kunci] =
      nilai && typeof nilai === "object" && !Array.isArray(nilai) && nilaiDasar && typeof nilaiDasar === "object"
        ? gabungTerjemahan(nilaiDasar, nilai)
        : nilai;
  }
  return hasil;
}

// Teks Mandarin yang belum diterjemahkan jatuh ke bahasa Inggris.
export const zh: Kamus = gabungTerjemahan(en, terjemahanZh) as Kamus;
