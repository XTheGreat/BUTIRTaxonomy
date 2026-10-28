"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { KUNCI_BAHASA, setBahasaAktif } from "./aktif";
import { bahasaBawaan, daftarBahasa, id, type Bahasa, type Kamus } from "./kamus";
import { judulSitusDikenal, muatKamus } from "./kamusMuat";

interface NilaiKonteks {
  bahasa: Bahasa;
  setBahasa: (b: Bahasa) => void;
  teks: Kamus;
}

const Konteks = createContext<NilaiKonteks>({
  bahasa: bahasaBawaan,
  setBahasa: () => {},
  teks: id,
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
  // Bahasa dan kamusnya diganti bersamaan setelah kamus selesai dimuat, jadi tampilan
  // tidak pernah memakai bahasa yang kamusnya belum ada.
  const [terpilih, setTerpilih] = useState<{ bahasa: Bahasa; kamus: Kamus }>({ bahasa: bahasaBawaan, kamus: id });
  const nomorPermintaan = useRef(0);

  const pilih = useCallback((b: Bahasa, simpan: boolean) => {
    const nomor = ++nomorPermintaan.current;
    muatKamus(b).then(
      (kamus) => {
        if (nomor !== nomorPermintaan.current) return; // sudah ada pilihan yang lebih baru
        setBahasaAktif(b);
        setTerpilih({ bahasa: b, kamus });
        if (simpan) {
          try {
            localStorage.setItem(KUNCI_BAHASA, b);
          } catch {}
        }
      },
      () => {
        // Kamus gagal diunduh: tetap di bahasa sebelumnya dan tidak menyimpan pilihan.
      },
    );
  }, []);

  // Dibaca setelah mount supaya HTML dari server dan render pertama klien sama.
  useEffect(() => {
    const tersimpan = bacaTersimpan();
    if (tersimpan && tersimpan !== bahasaBawaan) pilih(tersimpan, false);
  }, [pilih]);

  useEffect(() => {
    document.documentElement.lang = terpilih.bahasa === "zh" ? "zh-CN" : terpilih.bahasa;
    // Judul bawaan situs ikut bahasa; judul khusus halaman (mis. halaman info) dibiarkan.
    const judulBawaan = judulSitusDikenal();
    const judulSekarang = terpilih.kamus.umum.judulSitus;
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
  }, [terpilih]);

  const setBahasa = useCallback((b: Bahasa) => pilih(b, true), [pilih]);

  const nilai = useMemo(
    () => ({ bahasa: terpilih.bahasa, setBahasa, teks: terpilih.kamus }),
    [terpilih, setBahasa],
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
