"use client";

import { useBahasa, useTeks, type Bahasa } from "@/lib/teks";

interface PemilihBahasaProps {
  className?: string;
}

export default function PemilihBahasa({ className = "" }: PemilihBahasaProps) {
  const t = useTeks().shell.pemilihBahasa;
  const { bahasa, setBahasa } = useBahasa();

  const pilihan: { kode: Bahasa; singkat: string; nama: string }[] = [
    { kode: "id", singkat: t.idSingkat, nama: t.idNama },
    { kode: "en", singkat: t.enSingkat, nama: t.enNama },
    { kode: "zh", singkat: t.zhSingkat, nama: t.zhNama },
  ];

  return (
    <div role="radiogroup" aria-label={t.label} className={`inline-flex gap-1 ${className}`}>
      {pilihan.map(({ kode, singkat, nama }) => {
        const terpilih = bahasa === kode;
        return (
          <button
            key={kode}
            type="button"
            role="radio"
            aria-checked={terpilih}
            aria-label={nama}
            title={nama}
            onClick={() => setBahasa(kode)}
            className={`flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[11px] transition-colors duration-[140ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] ${
              terpilih
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]"
                : "border-[var(--line-strong)] bg-[var(--canvas)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                terpilih ? "bg-[var(--accent)]" : "border border-[var(--line-strong)]"
              }`}
            />
            {singkat}
          </button>
        );
      })}
    </div>
  );
}
