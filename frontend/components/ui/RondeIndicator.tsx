import React from "react";

export interface RondeIndicatorProps {
  ronde: number;
  maxRonde?: number;
  showText?: boolean;
  className?: string;
}

export default function RondeIndicator({
  ronde,
  maxRonde = 3,
  showText = true,
  className = "",
}: RondeIndicatorProps) {
  const current = Math.min(Math.max(ronde, 0), maxRonde);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className="inline-flex items-center gap-1.5 select-none"
        aria-label={`Ronde ${current} dari ${maxRonde}`}
        title={`Ronde ${current} dari ${maxRonde}`}
      >
        {Array.from({ length: maxRonde }).map((_, i) => {
          const isFilled = i < current;
          return (
            <span
              key={i}
              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all duration-140 ${
                isFilled
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--line-strong)] bg-transparent"
              }`}
            >
              {isFilled && (
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />
              )}
            </span>
          );
        })}
      </div>
      {showText && (
        <span className="font-sans text-xs text-[var(--ink-muted)] tabular-nums font-medium">
          Ronde {Math.max(current, 1)}
        </span>
      )}
    </div>
  );
}
