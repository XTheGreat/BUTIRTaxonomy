"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { BagianKepala, Subjudul } from "@/components/pengaturan/BagianKepala";
import Segmen from "@/components/pengaturan/Segmen";
import { useTeks } from "@/lib/teks";
import {
  TAMPILAN_BAWAAN,
  bacaTampilan,
  hapusTampilan,
  simpanTampilan,
  type Tampilan as NilaiTampilan,
  type UkuranTeks,
} from "@/lib/tampilan";

export default function Tampilan() {
  const t = useTeks().akun.pengaturan.tampilan;
  const [nilai, setNilai] = useState<NilaiTampilan>(bacaTampilan);

  function ubah(bagian: Partial<NilaiTampilan>) {
    const baru = { ...nilai, ...bagian };
    setNilai(baru);
    simpanTampilan(baru);
  }

  function kembalikan() {
    hapusTampilan();
    setNilai({ ...TAMPILAN_BAWAAN });
  }

  const hidupMati = [
    { nilai: "true", label: t.aktif },
    { nilai: "false", label: t.nonaktif },
  ];

  return (
    <div className="space-y-8">
      <BagianKepala judul={t.judul} keterangan={t.keterangan} />

      <section aria-labelledby="tampilan-tema" className="space-y-2">
        <Subjudul id="tampilan-tema">{t.tema.judul}</Subjudul>
        <p className="text-sm text-[var(--ink-muted)]">{t.tema.keterangan}</p>
        <Segmen
          label={t.tema.judul}
          nilai={nilai.tema}
          opsi={[
            { nilai: "terang", label: t.tema.terang },
            { nilai: "gelap", label: t.tema.gelap },
          ]}
          onUbah={(tema) => ubah({ tema })}
          className="pt-1"
        />
      </section>

      <section aria-labelledby="tampilan-ukuran" className="space-y-2">
        <Subjudul id="tampilan-ukuran">{t.ukuranTeks.judul}</Subjudul>
        <p className="text-sm text-[var(--ink-muted)]">{t.ukuranTeks.keterangan}</p>
        <Segmen<UkuranTeks>
          label={t.ukuranTeks.judul}
          nilai={nilai.ukuranTeks}
          opsi={[
            { nilai: "kecil", label: t.ukuranTeks.kecil },
            { nilai: "normal", label: t.ukuranTeks.normal },
            { nilai: "besar", label: t.ukuranTeks.besar },
          ]}
          onUbah={(ukuranTeks) => ubah({ ukuranTeks })}
          className="pt-1"
        />
      </section>

      <section aria-labelledby="tampilan-gerak" className="space-y-2">
        <Subjudul id="tampilan-gerak">{t.kurangiGerak.judul}</Subjudul>
        <p className="text-sm text-[var(--ink-muted)]">{t.kurangiGerak.keterangan}</p>
        <Segmen
          label={t.kurangiGerak.judul}
          nilai={String(nilai.kurangiGerak)}
          opsi={hidupMati}
          onUbah={(v) => ubah({ kurangiGerak: v === "true" })}
          className="pt-1"
        />
      </section>

      <section aria-labelledby="tampilan-kursor" className="space-y-2">
        <Subjudul id="tampilan-kursor">{t.kursor.judul}</Subjudul>
        <p className="text-sm text-[var(--ink-muted)]">{t.kursor.keterangan}</p>
        <Segmen
          label={t.kursor.judul}
          nilai={String(nilai.kursorKhusus)}
          opsi={hidupMati}
          onUbah={(v) => ubah({ kursorKhusus: v === "true" })}
          className="pt-1"
        />
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
        <Button type="button" variant="ghost" onClick={kembalikan}>
          {t.kembalikan}
        </Button>
        <p className="text-xs text-[var(--ink-muted)]">{t.catatan}</p>
      </div>
    </div>
  );
}
