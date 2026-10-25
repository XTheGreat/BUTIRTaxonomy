import React from "react";

export type BloomLevel = "C1" | "C2" | "C3" | "C4" | "C5" | "C6";

export const BLOOM_LEVELS: BloomLevel[] = ["C1", "C2", "C3", "C4", "C5", "C6"];

export const BLOOM_LABELS: Record<BloomLevel, string> = {
  C1: "Mengingat",
  C2: "Memahami",
  C3: "Menerapkan",
  C4: "Menganalisis",
  C5: "Mengevaluasi",
  C6: "Mencipta",
};

export interface BloomPieChartProps {
  bloom: Record<string, number>;
  total: number;
}

export const BLOOM_COLORS: Record<BloomLevel, string> = {
  C1: "#4A5568",
  C2: "#2D3748",
  C3: "#0F5F66",
  C4: "#18838B",
  C5: "#2B9EA8",
  C6: "#4CB8C4",
};

export default function BloomPieChart({ bloom, total }: BloomPieChartProps) {
  const cx = 90;
  const cy = 90;
  const radius = 78;

  function getCoordinates(percent: number) {
    const angle = percent * 2 * Math.PI - Math.PI / 2;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  }

  const effectiveTotal = total > 0 ? total : 100;
  let accumulated = 0;

  const slices = BLOOM_LEVELS.map((level) => {
    const value = bloom[level] || 0;
    const startPct = accumulated;
    accumulated += value;
    const endPct = accumulated;
    return {
      level,
      value,
      startPct: startPct / effectiveTotal,
      endPct: endPct / effectiveTotal,
      color: BLOOM_COLORS[level],
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 py-3 my-2">
      
      <div className="relative shrink-0">
        <svg
          width="180"
          height="180"
          viewBox="0 0 180 180"
          className="select-none transform transition-transform"
        >
          {total === 0 ? (
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="transparent"
              stroke="var(--line)"
              strokeWidth="16"
            />
          ) : (
            slices.map((slice) => {
              if (slice.value === 0) return null;
              if (slice.value === effectiveTotal) {
                return (
                  <circle
                    key={slice.level}
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill={slice.color}
                  />
                );
              }

              const [startX, startY] = getCoordinates(slice.startPct);
              const [endX, endY] = getCoordinates(slice.endPct);
              const sliceSpan = slice.endPct - slice.startPct;
              const largeArcFlag = sliceSpan > 0.5 ? 1 : 0;

              const pathData = [
                `M ${cx} ${cy}`,
                `L ${startX} ${startY}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                `Z`,
              ].join(" ");

              return (
                <path
                  key={slice.level}
                  d={pathData}
                  fill={slice.color}
                  stroke="var(--surface)"
                  strokeWidth="2"
                  className="transition-all duration-200 hover:opacity-90"
                >
                  <title>{`${slice.level} (${BLOOM_LABELS[slice.level]}): ${slice.value}%`}</title>
                </path>
              );
            })
          )}

          <circle cx={cx} cy={cy} r="46" fill="var(--surface)" />
          <text
            x={cx}
            y={cy - 7}
            textAnchor="middle"
            className="text-[10px] font-sans fill-[var(--ink-muted)] font-medium"
          >
            Total
          </text>
          <text
            x={cx}
            y={cy + 13}
            textAnchor="middle"
            className={`text-base font-sans font-bold tabular-nums ${
              total === 100 ? "fill-[#1F6B3A]" : "fill-[#A4262C]"
            }`}
          >
            {total}%
          </text>
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full text-xs">
        {BLOOM_LEVELS.map((level) => {
          const val = bloom[level] || 0;
          return (
            <div
              key={level}
              className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-[var(--line)]/20 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-4 h-2 rounded-sm shrink-0"
                  style={{ backgroundColor: BLOOM_COLORS[level] }}
                />
                <span className="font-mono text-[11px] font-semibold text-[var(--accent)]">
                  {level}
                </span>
                <span className="text-[11px] text-[var(--ink-muted)] font-sans truncate">
                  {BLOOM_LABELS[level]}
                </span>
              </div>
              <span className="font-sans font-semibold text-[var(--ink)] tabular-nums shrink-0">
                {val}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
