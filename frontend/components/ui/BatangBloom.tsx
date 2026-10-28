"use client";

import React from "react";
import { useTeks } from "@/lib/teks";
import { BLOOM_COLORS, BLOOM_LEVELS, BloomLevel } from "@/components/ui/BloomPieChart";

const TEKS_GELAP: BloomLevel[] = ["C5", "C6"];

export default function BatangBloom({ bloom }: { bloom: Record<string, number> }) {
  const t = useTeks().komponen.bloom;
  const total = BLOOM_LEVELS.reduce((jumlah, level) => jumlah + (bloom[level] || 0), 0);
  const sisa = Math.max(0, 100 - total);
  let jedaBerikutnya = 0;
  const segmen = BLOOM_LEVELS.flatMap((level) => {
    const nilai = bloom[level] || 0;
    if (nilai <= 0) return [];
    const delay = jedaBerikutnya;
    const durasi = Math.max(140, Math.round(nilai * 7));
    jedaBerikutnya += durasi + 45;
    return [{ level, nilai, delay, durasi }];
  });

  return (
    <div
      role="img"
      aria-label={t.distribusi(BLOOM_LEVELS.map((l) => `${l} ${bloom[l] || 0}%`).join(", "))}
      className="flex h-9 w-full overflow-hidden rounded border border-[var(--line-strong)] bg-[var(--canvas)]"
    >
      {segmen.map(({ level, nilai, delay, durasi }) => (
        <div
          key={level}
          title={`${level} (${t.tingkat[level]}): ${nilai}%`}
          style={{
            flexGrow: nilai,
            flexBasis: 0,
            backgroundColor: BLOOM_COLORS[level],
            animationDelay: `${delay}ms`,
            animationDuration: `${durasi}ms`,
          }}
          className={`diagram-animasi diagram-segment-reveal flex items-center justify-center border-r border-[var(--canvas)] font-mono text-[11px] font-semibold tabular-nums transition-[flex-grow] duration-[140ms] last:border-r-0 ${
            TEKS_GELAP.includes(level) ? "text-[var(--teks-pada-grafik-terang)]" : "text-white"
          }`}
        >
          {nilai >= 8 ? `${nilai}%` : ""}
        </div>
      ))}
      {sisa > 0 && (
        <div
          style={{
            flexGrow: sisa,
            flexBasis: 0,
            animationDelay: `${jedaBerikutnya}ms`,
            animationDuration: `${Math.max(140, Math.round(sisa * 7))}ms`,
          }}
          className="diagram-animasi diagram-segment-reveal flex items-center justify-center font-mono text-[11px] tabular-nums text-[var(--ink-muted)]"
        >
          {sisa >= 12 ? t.sisa(sisa) : ""}
        </div>
      )}
    </div>
  );
}
