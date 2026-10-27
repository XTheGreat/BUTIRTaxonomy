"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { bahasaBawaan, daftarBahasa, kamusPerBahasa, type Bahasa, type Kamus } from "./kamus";

const KUNCI_BAHASA = "butir_bahasa";

interface NilaiKonteks {
  bahasa: Bahasa;
  setBahasa: (b: Bahasa) => void;
  teks: Kamus;
}

const Konteks = createContext<NilaiKonteks>({
  bahasa: bahasaBawaan,
  setBahasa: () => {},
  teks: kamusPerBahasa[bahasaBawaan],
});

function bacaTersimpan(): Bahasa | null {
  try {
    const nilai = localStorage.getItem(KUNCI_BAHASA);
    return daftarBahasa.includes(nilai as Bahasa) ? (nilai as Bahasa) : null;
  } catch {
    return null;
  }
}

export function BahasaProvider({ children }: { children: React.ReactNode }) {
  const [bahasa, setBahasaState] = useState<Bahasa>(bahasaBawaan);

  // Dibaca setelah mount supaya HTML dari server dan render pertama klien sama.
  useEffect(() => {
    const tersimpan = bacaTersimpan();
    if (tersimpan) setBahasaState(tersimpan);
  }, []);

  useEffect(() => {
    document.documentElement.lang = bahasa;
  }, [bahasa]);

  const setBahasa = useCallback((b: Bahasa) => {
    setBahasaState(b);
    try {
      localStorage.setItem(KUNCI_BAHASA, b);
    } catch {}
  }, []);

  const nilai = useMemo(
    () => ({ bahasa, setBahasa, teks: kamusPerBahasa[bahasa] }),
    [bahasa, setBahasa],
  );

  return <Konteks.Provider value={nilai}>{children}</Konteks.Provider>;
}

export function useTeks(): Kamus {
  return useContext(Konteks).teks;
}

export function useBahasa() {
  const { bahasa, setBahasa } = useContext(Konteks);
  return { bahasa, setBahasa };
}
