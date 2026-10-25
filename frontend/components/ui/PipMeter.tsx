import React from "react";

export interface PipMeterProps {
  score: number;
  maxScore?: number;
  label?: string;
  className?: string;
}

export default function PipMeter({
  score,
  maxScore = 5,
  label,
  className = "",
}: PipMeterProps) {
  const clampedScore = Math.max(0, Math.min(score, maxScore));

  return (
    <div className={`inline-flex items-center gap-2 text-xs ${className}`}>
      {label && <span className="text-[var(--ink-muted)]">{label}</span>}
      <div className="inline-flex items-center gap-1 font-mono tracking-tighter" aria-label={`Skor ${clampedScore} dari ${maxScore}`}>
        {Array.from({ length: maxScore }).map((_, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full ${
              i < clampedScore
                ? "bg-[var(--accent)]"
                : "border border-[var(--line-strong)] bg-transparent"
            }`}
          />
        ))}
      </div>
      <span className="font-mono text-[var(--ink-muted)] text-[11px] tabular-nums">
        {clampedScore}/{maxScore}
      </span>
    </div>
  );
}
