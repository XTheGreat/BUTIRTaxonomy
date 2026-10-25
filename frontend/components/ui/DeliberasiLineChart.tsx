"use client";

import React, { useMemo, useState } from "react";
import { WARNA_GRAFIK } from "@/lib/warnaGrafik";

export interface DebatStats {
  diterima: number;
  ditandai: number;
  ditolak: number;
  tertunda: number;
  total: number;
}

interface ButirPoint {
  status: string;
  created_at: string;
}

interface DeliberasiLineChartProps {
  stats: DebatStats;
  butir: ButirPoint[];
}

const DAYS = 7;
const CANDLE_DAYS = 14;
const UP = WARNA_GRAFIK.naik;
const DOWN = WARNA_GRAFIK.turun;
const DAY_MS = 24 * 60 * 60 * 1000;

const CATEGORIES = [
  { key: "diterima", label: "Diterima", color: WARNA_GRAFIK.diterima },
  { key: "ditandai", label: "Ditandai", color: WARNA_GRAFIK.ditandai },
  { key: "ditolak", label: "Ditolak", color: WARNA_GRAFIK.ditolak },
  { key: "tertunda", label: "Tertunda", color: WARNA_GRAFIK.tertunda },
] as const;

type CatKey = (typeof CATEGORIES)[number]["key"];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function niceMax(v: number) {
  if (v <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / step) * step;
}

export default function DeliberasiLineChart({ stats, butir }: DeliberasiLineChartProps) {
  const [hoveredKey, setHoveredKey] = useState<CatKey | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [view, setView] = useState<"line" | "candle">("candle");
  const [candleIdx, setCandleIdx] = useState<number | null>(null);

  const candles = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cDays = Array.from({ length: CANDLE_DAYS }, (_, i) => new Date(today.getTime() - (CANDLE_DAYS - 1 - i) * DAY_MS));
    const start = cDays[0].getTime();

    const sorted = [...butir].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    let total = 0;
    let accepted = 0;
    const rateNow = () => (total > 0 ? (accepted / total) * 100 : 0);

    let k = 0;
    while (k < sorted.length && new Date(sorted[k].created_at).getTime() < start) {
      total++;
      if (sorted[k].status === "diterima") accepted++;
      k++;
    }

    return cDays.map((d) => {
      const end = d.getTime() + DAY_MS;
      const open = rateNow();
      let high = open;
      let low = open;
      let count = 0;
      while (k < sorted.length && new Date(sorted[k].created_at).getTime() < end) {
        total++;
        count++;
        if (sorted[k].status === "diterima") accepted++;
        const r = rateNow();
        high = Math.max(high, r);
        low = Math.min(low, r);
        k++;
      }
      return { date: d, open, high, low, close: rateNow(), count };
    });
  }, [butir]);

  const { days, series, yMax } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: DAYS }, (_, i) => new Date(today.getTime() - (DAYS - 1 - i) * DAY_MS));
    const index = new Map(days.map((d, i) => [dayKey(d), i]));

    const series: Record<CatKey, number[]> = {
      diterima: Array(DAYS).fill(0),
      ditandai: Array(DAYS).fill(0),
      ditolak: Array(DAYS).fill(0),
      tertunda: Array(DAYS).fill(0),
    };
    butir.forEach((b) => {
      const i = index.get(dayKey(new Date(b.created_at)));
      if (i !== undefined && b.status in series) series[b.status as CatKey][i]++;
    });

    const peak = Math.max(...Object.values(series).flat(), 1);
    return { days, series, yMax: niceMax(peak) };
  }, [butir]);

  const W = 480;
  const H = 220;
  const padL = 32;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const x = (i: number) => padL + (innerW * i) / (DAYS - 1);
  const y = (v: number) => padT + innerH - (innerH * v) / yMax;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(yMax * t));

  const fmtDay = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-base font-normal text-[var(--ink)] mb-0.5">
            Hasil Deliberasi Agen
          </h3>
          <p className="text-xs text-[var(--ink-muted)]">
            {view === "candle"
              ? `Tingkat penerimaan butir kumulatif, ${CANDLE_DAYS} hari terakhir.`
              : `Butir per keputusan dalam ${DAYS} hari terakhir.`}
          </p>
        </div>
        <div className="inline-flex rounded border border-[var(--line)] bg-[var(--surface)] p-0.5 text-[11px] font-sans shrink-0">
          {(
            [
              { id: "candle", label: "Lilin" },
              { id: "line", label: "Garis" },
            ] as const
          ).map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setView(o.id)}
              className={`px-2 py-0.5 rounded transition-colors duration-140 ${
                view === o.id
                  ? "bg-[var(--canvas)] text-[var(--ink)] font-semibold"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {view === "candle" ? (
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto select-none"
            role="img"
            aria-label="Grafik candlestick tingkat penerimaan butir kumulatif per hari"
            onMouseLeave={() => setCandleIdx(null)}
          >
            {[0, 25, 50, 75, 100].map((t) => {
              const yy = padT + innerH - (innerH * t) / 100;
              return (
                <g key={t}>
                  <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="var(--line)" strokeWidth="1" />
                  <text x={padL - 6} y={yy + 3.5} textAnchor="end" className="font-mono text-[10px] fill-[var(--ink-muted)]">
                    {t}%
                  </text>
                </g>
              );
            })}

            {candles.map((c, i) => {
              const slot = innerW / CANDLE_DAYS;
              const cx = padL + slot * (i + 0.5);
              const bw = slot * 0.56;
              const yc = (v: number) => padT + innerH - (innerH * v) / 100;
              const up = c.close >= c.open;
              const color = up ? UP : DOWN;
              const bodyTop = yc(Math.max(c.open, c.close));
              const bodyH = Math.max(Math.abs(yc(c.open) - yc(c.close)), 1.5);
              const idle = c.count === 0;
              return (
                <g key={i} opacity={idle ? 0.45 : 1}>
                  {candleIdx === i && (
                    <rect x={cx - slot / 2} y={padT} width={slot} height={innerH} fill="var(--surface)" />
                  )}
                  <line x1={cx} x2={cx} y1={yc(c.high)} y2={yc(c.low)} stroke={color} strokeWidth="1.5" />
                  <rect x={cx - bw / 2} y={bodyTop} width={bw} height={bodyH} fill={color} />
                  {(i % 2 === 0 || CANDLE_DAYS <= 7) && (
                    <text x={cx} y={H - 8} textAnchor="middle" className="font-mono text-[10px] fill-[var(--ink-muted)]">
                      {fmtDay(c.date)}
                    </text>
                  )}
                  <rect
                    x={cx - slot / 2}
                    y={padT}
                    width={slot}
                    height={innerH}
                    fill="transparent"
                    onMouseEnter={() => setCandleIdx(i)}
                  />
                </g>
              );
            })}
          </svg>

          {candleIdx !== null && (
            <div
              className="absolute top-0 pointer-events-none rounded-md border border-[var(--line)] bg-[var(--canvas)] px-2.5 py-2 text-xs"
              style={{
                left: `${((padL + (innerW / CANDLE_DAYS) * (candleIdx + 0.5)) / W) * 100}%`,
                transform: candleIdx > CANDLE_DAYS / 2 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
                boxShadow: "var(--shadow-overlay)",
              }}
            >
              <div className="font-mono text-[10px] text-[var(--ink-muted)] mb-1">
                {fmtDay(candles[candleIdx].date)} · {candles[candleIdx].count} butir
              </div>
              {(
                [
                  ["Buka", candles[candleIdx].open],
                  ["Tinggi", candles[candleIdx].high],
                  ["Rendah", candles[candleIdx].low],
                  ["Tutup", candles[candleIdx].close],
                ] as const
              ).map(([label, v]) => (
                <div key={label} className="flex items-center gap-4">
                  <span className="text-[var(--ink)] flex-1">{label}</span>
                  <span className="font-mono tabular-nums text-[var(--ink)]">{v.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 mt-1 text-[11px] text-[var(--ink-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: UP }} /> Naik
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: DOWN }} /> Turun
            </span>
            <span>Redup: tidak ada butir baru</span>
          </div>
        </div>
      ) : (
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto select-none"
          role="img"
          aria-label="Grafik garis jumlah butir per keputusan debat dalam 7 hari terakhir"
          onMouseLeave={() => setHoverIdx(null)}
        >
          {ticks.map((t, i) => (
            <g key={i}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--line)"
                strokeWidth="1"
              />
              <text
                x={padL - 6}
                y={y(t) + 3.5}
                textAnchor="end"
                className="font-mono text-[10px] fill-[var(--ink-muted)]"
              >
                {t}
              </text>
            </g>
          ))}

          {days.map((d, i) => (
            <text
              key={i}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              className="font-mono text-[10px] fill-[var(--ink-muted)]"
            >
              {fmtDay(d)}
            </text>
          ))}

          {hoverIdx !== null && (
            <line
              x1={x(hoverIdx)}
              x2={x(hoverIdx)}
              y1={padT}
              y2={padT + innerH}
              stroke="var(--line-strong)"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
          )}

          {CATEGORIES.map((cat) => {
            const dim = hoveredKey !== null && hoveredKey !== cat.key;
            const points = series[cat.key].map((v, i) => `${x(i)},${y(v)}`).join(" ");
            return (
              <g key={cat.key} opacity={dim ? 0.25 : 1} style={{ transition: "opacity 140ms ease-out" }}>
                <polyline
                  points={points}
                  fill="none"
                  stroke={cat.color}
                  strokeWidth={hoveredKey === cat.key ? 3 : 2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {series[cat.key].map((v, i) => (
                  <circle
                    key={i}
                    cx={x(i)}
                    cy={y(v)}
                    r={hoverIdx === i ? 4 : 2.5}
                    fill={cat.color}
                    stroke="var(--canvas)"
                    strokeWidth="1.5"
                  />
                ))}
              </g>
            );
          })}

          {days.map((_, i) => (
            <rect
              key={i}
              x={x(i) - innerW / (DAYS - 1) / 2}
              y={padT}
              width={innerW / (DAYS - 1)}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
            />
          ))}
        </svg>

        {hoverIdx !== null && (
          <div
            className="absolute top-0 pointer-events-none rounded-md border border-[var(--line)] bg-[var(--canvas)] px-2.5 py-2 text-xs"
            style={{
              left: `${(x(hoverIdx) / W) * 100}%`,
              transform: hoverIdx > DAYS / 2 ? "translateX(calc(-100% - 8px))" : "translateX(8px)",
              boxShadow: "var(--shadow-overlay)",
            }}
          >
            <div className="font-mono text-[10px] text-[var(--ink-muted)] mb-1">
              {fmtDay(days[hoverIdx])}
            </div>
            {CATEGORIES.map((cat) => (
              <div key={cat.key} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-[var(--ink)] flex-1">{cat.label}</span>
                <span className="font-mono tabular-nums text-[var(--ink)]">
                  {series[cat.key][hoverIdx]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {CATEGORIES.map((cat) => {
          const count = stats[cat.key];
          const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
          return (
            <div
              key={cat.key}
              onMouseEnter={() => setHoveredKey(cat.key)}
              onMouseLeave={() => setHoveredKey(null)}
              className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors duration-140 ${
                hoveredKey === cat.key ? "bg-[var(--surface)]" : ""
              }`}
            >
              <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: cat.color }} />
              <span className="text-sm text-[var(--ink)] flex-1 truncate">{cat.label}</span>
              <span className="font-serif text-sm tabular-nums text-[var(--ink)]">{count}</span>
              <span className="font-mono text-[11px] tabular-nums text-[var(--ink-muted)] w-9 text-right">
                {Math.round(pct)}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-[var(--line)] flex justify-between items-center text-xs text-[var(--ink-muted)]">
        <span>Total butir diproses</span>
        <span className="font-mono tabular-nums font-semibold text-[var(--ink)]">{stats.total}</span>
      </div>
    </div>
  );
}
