"use client";

import React from "react";
import { useTeks } from "@/lib/teks";

export interface BloomChipProps {
  level: string;
  target?: string | null;
  className?: string;
}

export default function BloomChip({ level, target, className = "" }: BloomChipProps) {
  const t = useTeks().komponen.bloom;
  if (!level) return null;
  const bergeser = !!target && target !== level;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-['Times_New_Roman',Times,serif] font-semibold bg-[var(--surface)] text-[var(--accent)] border border-[var(--line)]"
      >
        {level}
      </span>
      {bergeser && (
        <span
          className="font-mono text-[10px] font-semibold text-[var(--accent)] whitespace-nowrap"
          title={t.bergeser(target!, level)}
        >
          {t.target(target!)}
        </span>
      )}
    </span>
  );
}
