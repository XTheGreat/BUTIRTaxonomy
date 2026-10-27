"use client";

import React from "react";
import { Search } from "lucide-react";
import { BLOOM_COLORS, BLOOM_LABELS, BLOOM_LEVELS } from "@/components/ui/BloomPieChart";
import { KelompokBank } from "@/lib/kelompokBank";
import { useTeks } from "@/lib/teks";

export interface NilaiFilterButir {
  cari: string;
  kisi: string;
  bloom: string[];
  hanyaTerpilih: boolean;
}

export const FILTER_AWAL: NilaiFilterButir = { cari: "", kisi: "", bloom: [], hanyaTerpilih: false };

export function filterAktif(f: NilaiFilterButir): boolean {
  return Boolean(f.cari.trim() || f.kisi || f.bloom.length || f.hanyaTerpilih);
}

const inputCls =
  "bg-[var(--canvas)] text-[var(--ink)] border border-[var(--line-strong)] rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-[var(--accent)]";

export default function FilterButir({
  nilai,
  onUbah,
  kelompok,
  jumlahTampil,
  jumlahTotal,
  tanpaBloom = false,
}: {
  nilai: NilaiFilterButir;
  onUbah: (baru: NilaiFilterButir) => void;
  kelompok: KelompokBank[];
  jumlahTampil: number;
  jumlahTotal: number;
  tanpaBloom?: boolean;
}) {
  const t = useTeks().telaah.filter;
  const aktif = filterAktif(nilai);
  const ubahBloom = (level: string) =>
    onUbah({
      ...nilai,
      bloom: nilai.bloom.includes(level) ? nilai.bloom.filter((l) => l !== level) : [...nilai.bloom, level],
    });

  return (
    <div className="mb-4 space-y-3 border border-[var(--line)] bg-[var(--surface)] p-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_minmax(0,16rem)]">
        <label className="relative block">
          <span className="sr-only">{t.cariTeksSoal}</span>
          <Search
            size={15}
            strokeWidth={1.8}
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
          />
          <input
            type="search"
            value={nilai.cari}
            onChange={(e) => onUbah({ ...nilai, cari: e.target.value })}
            placeholder={t.cariTeksSoal}
            className={`${inputCls} w-full pl-8`}
          />
        </label>
        <label className="block">
          <span className="sr-only">{t.saringKisiKisi}</span>
          <select
            value={nilai.kisi}
            onChange={(e) => onUbah({ ...nilai, kisi: e.target.value })}
            className={`${inputCls} w-full`}
          >
            <option value="">{t.semuaKisiKisi}</option>
            {kelompok.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label} ({t.keUrutan(k.urutan)})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {!tanpaBloom && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t.saringBloom}>
          <span className="mr-1 font-sans text-xs text-[var(--ink-muted)]">{t.level}</span>
          {BLOOM_LEVELS.map((level) => {
            const dipilih = nilai.bloom.includes(level);
            return (
              <button
                key={level}
                type="button"
                aria-pressed={dipilih}
                title={`${level} (${BLOOM_LABELS[level]})`}
                onClick={() => ubahBloom(level)}
                className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-xs font-semibold transition-colors duration-[140ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                  dipilih
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--line-strong)] bg-[var(--canvas)] text-[var(--ink)] hover:border-[var(--accent)]"
                }`}
              >
                <span aria-hidden="true" className="h-2 w-2" style={{ backgroundColor: BLOOM_COLORS[level] }} />
                {level}
              </button>
            );
          })}
        </div>
        )}

        <label className="flex cursor-pointer select-none items-center gap-1.5 font-sans text-xs text-[var(--ink)]">
          <input
            type="checkbox"
            checked={nilai.hanyaTerpilih}
            onChange={(e) => onUbah({ ...nilai, hanyaTerpilih: e.target.checked })}
            className="accent-[var(--accent)]"
          />
          {t.hanyaTerpilih}
        </label>

        <div className="ml-auto flex items-center gap-3 font-mono text-xs tabular-nums text-[var(--ink-muted)]">
          <span>
            {t.menampilkan} <span className="text-[var(--ink)]">{jumlahTampil}</span> {t.dariTotal(jumlahTotal)}
          </span>
          {aktif && (
            <button
              type="button"
              onClick={() => onUbah(FILTER_AWAL)}
              className="font-sans font-medium text-[var(--accent)] underline-offset-4 hover:underline focus-visible:outline-none"
            >
              {t.aturUlang}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
