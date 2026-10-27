"use client";

import React, { useCallback, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useFormat } from "@/lib/format";
import { useTeks } from "@/lib/teks";
import { ID_TANPA_KELOMPOK, KelompokBank } from "@/lib/kelompokBank";

export function useBukaTutup() {
  const [terbuka, setTerbuka] = useState<Set<string>>(new Set());
  const ada = useCallback((id: string) => terbuka.has(id), [terbuka]);
  const toggle = useCallback((id: string) => {
    setTerbuka((prev) => {
      const baru = new Set(prev);
      if (baru.has(id)) baru.delete(id);
      else baru.add(id);
      return baru;
    });
  }, []);
  return { ada, toggle };
}

export default function KelompokLipat({
  kelompok,
  jumlah,
  terbuka,
  onToggle,
  aksi,
  tambahan,
  bingkai = false,
  children,
}: {
  kelompok: KelompokBank;
  jumlah: number;
  terbuka: boolean;
  onToggle: () => void;
  aksi?: React.ReactNode;
  tambahan?: React.ReactNode;
  bingkai?: boolean;
  children: React.ReactNode;
}) {
  const { komponen, umum } = useTeks();
  const t = komponen.kelompokLipat;
  const label = kelompok.id === ID_TANPA_KELOMPOK ? umum.tanpaKelompok : kelompok.label;
  const { waktu } = useFormat();
  return (
    <section
      aria-label={label}
      className={bingkai ? "border border-[var(--line-strong)] rounded-md bg-[var(--canvas)]" : ""}
    >
      <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 ${bingkai ? "px-3 py-2.5" : "py-3"}`}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={terbuka}
          className="flex min-w-0 flex-1 basis-48 items-center gap-2.5 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]"
        >
          <ChevronRight
            size={16}
            strokeWidth={2}
            aria-hidden="true"
            className={`shrink-0 text-[var(--ink-muted)] transition-transform duration-[140ms] ${terbuka ? "rotate-90" : ""}`}
          />
          <span className="min-w-0">
            <span className="flex items-baseline gap-2.5">
              <span className="min-w-0 break-words font-serif text-[15px] font-medium text-[var(--ink)] sm:truncate">{label}</span>
              {kelompok.urutan > 0 && (
                <span className="shrink-0 font-mono text-[11px] text-[var(--ink-muted)]">
                  {t.kisiKisiKe}<span className="tabular-nums text-[var(--ink)]">{kelompok.urutan}</span>
                </span>
              )}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--ink-muted)]">
              {kelompok.urutan > 0 && (
                <span>
                  {t.dibuat} <span className="font-mono tabular-nums">{waktu(kelompok.created_at)}</span>
                </span>
              )}
              <span>
                <span className="font-mono tabular-nums text-[var(--ink)]">{jumlah}</span> {t.butirDiterima}
              </span>
              {tambahan}
            </span>
          </span>
        </button>
        {aksi}
      </div>
      {terbuka && <div className={bingkai ? "border-t border-[var(--line)]" : "pb-3"}>{children}</div>}
    </section>
  );
}
