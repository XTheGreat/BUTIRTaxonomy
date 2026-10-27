"use client";

import HalamanInfo, { Bagian } from "@/components/layout/HalamanInfo";
import { useTeks } from "@/lib/teks";

export default function PrivasiIsi() {
  const t = useTeks();
  const p = t.info.privasi;

  return (
    <HalamanInfo judul={p.judul} ringkasan={p.ringkasan}>
      <Bagian judul={p.data.judul}>
        <ul className="list-disc space-y-1.5 pl-5">
          {p.data.butir.map(([label, uraian]) => (
            <li key={label}>
              <span className="font-medium">{label}</span> {uraian}
            </li>
          ))}
        </ul>
      </Bagian>

      <Bagian judul={p.ai.judul}>
        <p>{p.ai.isi}</p>
      </Bagian>

      <Bagian judul={p.sesi.judul}>
        <p>{p.sesi.isi}</p>
      </Bagian>

      <Bagian judul={p.pembagian.judul}>
        <p>{p.pembagian.isi}</p>
      </Bagian>

      <Bagian judul={p.penghapusan.judul}>
        <p>{p.penghapusan.isi}</p>
      </Bagian>

      <p className="border-t border-[var(--line)] pt-4 font-mono text-[11px] text-[var(--ink-muted)]">
        {p.catatanAkhir}
      </p>
    </HalamanInfo>
  );
}
