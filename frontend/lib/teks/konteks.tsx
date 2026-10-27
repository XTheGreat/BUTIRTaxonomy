"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { KUNCI_BAHASA, setBahasaAktif } from "./aktif";
import { bahasaBawaan, daftarBahasa, kamusPerBahasa, type Bahasa, type Kamus } from "./kamus";

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
    if (tersimpan) {
      setBahasaAktif(tersimpan);
      setBahasaState(tersimpan);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = bahasa;
    // Judul bawaan situs ikut bahasa; judul khusus halaman (mis. halaman info) dibiarkan.
    const judulBawaan = daftarBahasa.map((b) => kamusPerBahasa[b].umum.judulSitus);
    const judulSekarang = kamusPerBahasa[bahasa].umum.judulSitus;
    const terapkan = () => {
      if (judulBawaan.includes(document.title) && document.title !== judulSekarang) {
        document.title = judulSekarang;
      }
    };
    terapkan();
    // Next menulis ulang <title> saat metadata selesai dimuat, jadi diawasi.
    const pengamat = new MutationObserver(terapkan);
    pengamat.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => pengamat.disconnect();
  }, [bahasa]);

  const setBahasa = useCallback((b: Bahasa) => {
    setBahasaAktif(b);
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
