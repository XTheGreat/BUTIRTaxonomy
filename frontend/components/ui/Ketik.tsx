"use client";

import { createContext, useContext, useEffect, useState } from "react";
import MathText from "@/components/ui/MathText";

export const AnimasiKetik = createContext(false);

const POLA_RUMUS = /\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\$[^$\n]+\$/g;

export function potongAman(teks: string, n: number): string {
  if (n >= teks.length) return teks;
  for (const m of teks.matchAll(POLA_RUMUS)) {
    const awal = m.index ?? 0;
    if (n > awal && n < awal + m[0].length) return teks.slice(0, awal);
  }
  return teks.slice(0, n);
}

const MS_PER_HURUF = 14;
const DURASI_MIN = 450;
const DURASI_MAKS = 2800;

function useMengetik(teks: string, aktif: boolean, tunda: number): number {
  const [jumlah, setJumlah] = useState(aktif ? 0 : teks.length);

  useEffect(() => {
    if (!aktif || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setJumlah(teks.length);
      return;
    }
    const total = teks.length;
    const durasi = Math.min(DURASI_MAKS, Math.max(DURASI_MIN, total * MS_PER_HURUF));
    const mulai = performance.now() + tunda;
    let frame = 0;
    const tik = (sekarang: number) => {
      const p = Math.min(1, Math.max(0, (sekarang - mulai) / durasi));
      setJumlah(Math.floor(p * total));
      if (p < 1) frame = requestAnimationFrame(tik);
    };
    setJumlah(0);
    frame = requestAnimationFrame(tik);
    return () => cancelAnimationFrame(frame);
  }, [teks, aktif, tunda]);

  return jumlah;
}

export default function Ketik({ text, tunda = 0 }: { text: string; tunda?: number }) {
  const aktif = useContext(AnimasiKetik);
  const jumlah = useMengetik(text, aktif, tunda);
  const selesai = jumlah >= text.length;

  return (
    <>
      <MathText text={potongAman(text, jumlah)} />
      {aktif && !selesai && <span aria-hidden="true" className="kursor-ketik" />}
    </>
  );
}
