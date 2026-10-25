import React from "react";
import { BLOOM_COLORS, BLOOM_LABELS, BLOOM_LEVELS, BloomLevel } from "@/components/ui/BloomPieChart";

const TEKS_GELAP: BloomLevel[] = ["C5", "C6"];

export default function BatangBloom({ bloom }: { bloom: Record<string, number> }) {
  const total = BLOOM_LEVELS.reduce((jumlah, level) => jumlah + (bloom[level] || 0), 0);
  const sisa = Math.max(0, 100 - total);

  return (
    <div
      role="img"
      aria-label={`Distribusi Bloom: ${BLOOM_LEVELS.map((l) => `${l} ${bloom[l] || 0}%`).join(", ")}`}
      className="flex h-9 w-full overflow-hidden rounded border border-[var(--line-strong)] bg-[var(--canvas)]"
    >
      {BLOOM_LEVELS.map((level) => {
        const nilai = bloom[level] || 0;
        if (nilai <= 0) return null;
        return (
          <div
            key={level}
            title={`${level} (${BLOOM_LABELS[level]}): ${nilai}%`}
            style={{ flexGrow: nilai, flexBasis: 0, backgroundColor: BLOOM_COLORS[level] }}
            className={`flex items-center justify-center border-r border-[var(--canvas)] font-mono text-[11px] font-semibold tabular-nums transition-[flex-grow] duration-[140ms] last:border-r-0 ${
              TEKS_GELAP.includes(level) ? "text-[var(--ink)]" : "text-white"
            }`}
          >
            {nilai >= 8 ? `${nilai}%` : ""}
          </div>
        );
      })}
      {sisa > 0 && (
        <div
          style={{ flexGrow: sisa, flexBasis: 0 }}
          className="flex items-center justify-center font-mono text-[11px] tabular-nums text-[var(--ink-muted)]"
        >
          {sisa >= 12 ? `sisa ${sisa}%` : ""}
        </div>
      )}
    </div>
  );
}
