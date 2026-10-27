"use client";

import HalamanInfo, { Bagian } from "@/components/layout/HalamanInfo";
import { useTeks } from "@/lib/teks";

function Daftar({ data }: { data: string[][] }) {
  return (
    <ol className="space-y-3">
      {data.map(([judul, uraian], i) => (
        <li key={judul} className="flex gap-3">
          <span className="mt-0.5 w-5 shrink-0 font-mono text-xs tabular-nums text-[var(--accent)]">{i + 1}</span>
          <p>
            <span className="font-medium">{judul}.</span> <span className="text-[var(--ink-muted)]">{uraian}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}

export default function PanduanIsi() {
  const t = useTeks();
  const p = t.info.panduan;

  return (
    <HalamanInfo judul={p.judul} ringkasan={p.ringkasan}>
      <Bagian judul={p.guru.judul}>
        <Daftar data={p.guru.langkah} />
      </Bagian>

      <Bagian judul={p.siswa.judul}>
        <Daftar data={p.siswa.langkah} />
      </Bagian>

      <Bagian judul={p.tips.judul}>
        <ul className="list-disc space-y-1.5 pl-5 text-[var(--ink-muted)]">
          {p.tips.butir.map((teks) => (
            <li key={teks}>{teks}</li>
          ))}
        </ul>
      </Bagian>
    </HalamanInfo>
  );
}
