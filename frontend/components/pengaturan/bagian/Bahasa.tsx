"use client";

import { BagianKepala } from "@/components/pengaturan/BagianKepala";
import Segmen from "@/components/pengaturan/Segmen";
import { useBahasa, useTeks, type Bahasa as KodeBahasa } from "@/lib/teks";

export default function Bahasa() {
  const t = useTeks().akun.pengaturan;
  const { bahasa, setBahasa } = useBahasa();

  return (
    <div className="space-y-6">
      <BagianKepala judul={t.bahasa.judul} keterangan={t.bahasa.keterangan} />
      <Segmen<KodeBahasa>
        label={t.bahasa.judul}
        nilai={bahasa}
        opsi={[
          { nilai: "id", label: t.bahasa.indonesia },
          { nilai: "en", label: t.bahasa.inggris },
        ]}
        onUbah={setBahasa}
      />
      <p className="text-xs leading-relaxed text-[var(--ink-muted)]">{t.bahasa.catatan}</p>
    </div>
  );
}
