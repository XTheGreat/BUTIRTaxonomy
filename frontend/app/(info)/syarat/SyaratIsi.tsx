"use client";

import HalamanInfo, { Bagian } from "@/components/layout/HalamanInfo";
import { useTeks } from "@/lib/teks";

export default function SyaratIsi() {
  const t = useTeks();
  const s = t.info.syarat;

  return (
    <HalamanInfo judul={s.judul} ringkasan={s.ringkasan}>
      <Bagian judul={s.pemakaian.judul}>
        <p>{s.pemakaian.isi}</p>
      </Bagian>

      <Bagian judul={s.materi.judul}>
        <p>{s.materi.isi}</p>
      </Bagian>

      <Bagian judul={s.hasilAi.judul}>
        <p>{s.hasilAi.isi}</p>
      </Bagian>

      <Bagian judul={s.ketersediaan.judul}>
        <p>{s.ketersediaan.isi}</p>
      </Bagian>

      <Bagian judul={s.pembatasan.judul}>
        <p>{s.pembatasan.isi}</p>
      </Bagian>

      <p className="border-t border-[var(--line)] pt-4 font-mono text-[11px] text-[var(--ink-muted)]">
        {s.catatanAkhir}
      </p>
    </HalamanInfo>
  );
}
