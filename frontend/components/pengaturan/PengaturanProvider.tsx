"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import PengaturanDialog from "@/components/pengaturan/PengaturanDialog";
import { BAGIAN_AWAL, DAFTAR_BAGIAN } from "@/components/pengaturan/bagian";

interface NilaiPengaturan {
  /** Membuka dialog Pengaturan, opsional langsung ke satu bagian (id di `DAFTAR_BAGIAN`). */
  buka: (bagian?: string) => void;
  tutup: () => void;
}

const Konteks = createContext<NilaiPengaturan>({ buka: () => {}, tutup: () => {} });

export function PengaturanProvider({ children }: { children: React.ReactNode }) {
  const [terbuka, setTerbuka] = useState(false);
  const [bagian, setBagian] = useState(BAGIAN_AWAL);

  const buka = useCallback((id?: string) => {
    setBagian(id && DAFTAR_BAGIAN.some((b) => b.id === id) ? id : BAGIAN_AWAL);
    setTerbuka(true);
  }, []);
  const tutup = useCallback(() => setTerbuka(false), []);

  const nilai = useMemo(() => ({ buka, tutup }), [buka, tutup]);

  return (
    <Konteks.Provider value={nilai}>
      {children}
      {terbuka && <PengaturanDialog bagianAktif={bagian} onPilih={setBagian} onTutup={tutup} />}
    </Konteks.Provider>
  );
}

export function usePengaturan() {
  return useContext(Konteks);
}
