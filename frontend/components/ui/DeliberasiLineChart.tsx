"use client";

import React, { useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { WARNA_GRAFIK } from "@/lib/warnaGrafik";
import { useTeks } from "@/lib/teks";

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
const UP = WARNA_GRAFIK.naik;
const DOWN = WARNA_GRAFIK.turun;
const DAY_MS = 24 * 60 * 60 * 1000;
const CANDLE_HEIGHT = 276;
const CANDLE_PLOT_TOP = 12;
const CANDLE_PLOT_BOTTOM = 172;
const CANDLE_VOLUME_TOP = 192;
const CANDLE_VOLUME_BOTTOM = 234;
const CANDLE_DATE_Y = 260;

const CATEGORIES = [
  { key: "diterima", color: WARNA_GRAFIK.diterima },
  { key: "ditandai", color: WARNA_GRAFIK.ditandai },
  { key: "ditolak", color: WARNA_GRAFIK.ditolak },
  { key: "tertunda", color: WARNA_GRAFIK.tertunda },
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
  const tl = useTeks().telaah;
  const tg = tl.grafik;
  const [hoveredKey, setHoveredKey] = useState<CatKey | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [view, setView] = useState<"line" | "candle">("candle");
  const [candleDays, setCandleDays] = useState<7 | 14 | 30>(14);
  const [candleIdx, setCandleIdx] = useState<number | null>(null);
  const [candleCursor, setCandleCursor] = useState<{
    x: number;
    y: number;
    valueY: number | null;
    flipX: boolean;
  } | null>(null);
  const [focusedCandle, setFocusedCandle] = useState<number | null>(null);
  const candleChartRef = useRef<HTMLDivElement>(null);
  const candleTooltipRef = useRef<HTMLDivElement>(null);

  const candles = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cDays = Array.from({ length: candleDays }, (_, i) => new Date(today.getTime() - (candleDays - 1 - i) * DAY_MS));
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
  }, [butir, candleDays]);

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
  const candleW = W;
  const candleInnerW = candleW - padL - padR;
  const padT = 12;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const x = (i: number) => padL + (innerW * i) / (DAYS - 1);
  const y = (v: number) => padT + innerH - (innerH * v) / yMax;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(yMax * t));

  const fmtDay = (d: Date) => d.toLocaleDateString(tl.umum.lokalWaktu, { day: "numeric", month: "short" });
  const fmtPercent = (v: number) => new Intl.NumberFormat(tl.umum.lokalWaktu, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(v);
  const volumeMax = Math.max(1, ...candles.map((day) => day.count));
  const candleAwal = candles[0];
  const candleAkhir = candles[candles.length - 1];
  const deltaPenerimaan = candleAwal && candleAkhir
    ? candleAkhir.close - candleAwal.open
    : 0;
  const volumeHarian = days.map((date, index) => ({
    date,
    total: CATEGORIES.reduce((sum, category) => sum + series[category.key][index], 0),
  }));
  const volumeTerurut = volumeHarian.map(({ total }) => total).sort((a, b) => a - b);
  const medianHarian = volumeTerurut[Math.floor(volumeTerurut.length / 2)] ?? 0;
  const hariAktif = volumeHarian.filter(({ total }) => total > 0).length;
  const hariTanpaAktivitas = volumeHarian.filter(({ total }) => total === 0);
  const puncakHarian = volumeHarian.reduce<(typeof volumeHarian)[number] | null>(
    (tertinggi, hari) => hari.total > (tertinggi?.total ?? 0) ? hari : tertinggi,
    null,
  );
  const ringkasanAktivitas = [
    {
      label: tg.puncakPemrosesan,
      value: puncakHarian
        ? `${tg.jumlahButir(puncakHarian.total)} | ${fmtDay(puncakHarian.date)}`
        : tg.tidakAda,
    },
    { label: tg.medianHarian, value: tg.butirPerHari(medianHarian) },
    { label: tg.hariAktif, value: tg.hariAktifValue(hariAktif, DAYS) },
    {
      label: tg.tanggalTanpaAktivitas,
      value: hariTanpaAktivitas.length > 0
        ? hariTanpaAktivitas.map(({ date }) => fmtDay(date)).join(", ")
        : tg.tidakAda,
    },
  ];

  function arahkanCandle(clientX: number, clientY: number) {
    const chart = candleChartRef.current;
    if (!chart) return;
    const bounds = chart.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const svgX = ((clientX - bounds.left) / bounds.width) * candleW;
    const svgY = ((clientY - bounds.top) / bounds.height) * CANDLE_HEIGHT;
    const slot = candleInnerW / candleDays;
    if (svgX < padL - slot / 2 || svgX > candleW - padR + slot / 2 || svgY < CANDLE_PLOT_TOP || svgY > CANDLE_VOLUME_BOTTOM) {
      setCandleIdx(null);
      setCandleCursor(null);
      return;
    }

    const index = Math.max(0, Math.min(candleDays - 1, Math.floor((svgX - padL) / slot)));
    const valueY = svgY <= CANDLE_PLOT_BOTTOM
      ? Math.max(CANDLE_PLOT_TOP, Math.min(CANDLE_PLOT_BOTTOM, svgY))
      : null;
    setCandleIdx(index);
    setCandleCursor({
      x: clientX - bounds.left,
      y: clientY - bounds.top,
      valueY,
      flipX: clientX - bounds.left > bounds.width / 2,
    });
  }

  function focusCandle(index: number) {
    setFocusedCandle(index);
    setCandleIdx(index);
    const chart = candleChartRef.current;
    if (!chart) return;
    const bounds = chart.getBoundingClientRect();
    const slot = candleInnerW / candleDays;
    const cx = padL + slot * (index + 0.5);
    const y = CANDLE_PLOT_TOP + 16;
    setCandleCursor({
      x: (cx / candleW) * bounds.width,
      y: (y / CANDLE_HEIGHT) * bounds.height,
      valueY: y,
      flipX: cx > candleW / 2,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-base font-normal text-[var(--ink)] mb-0.5">
            {tg.judul}
          </h3>
          <p className="text-xs text-[var(--ink-muted)]">
            {view === "candle"
              ? tg.keteranganLilin(candleDays)
              : tg.keteranganGaris(DAYS)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="inline-flex rounded border border-[var(--line)] bg-[var(--surface)] p-0.5 text-[11px] font-sans">
            {(
              [
                { id: "candle", label: tg.lilin },
                { id: "line", label: tg.garis },
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
          {view === "candle" && (
            <div role="group" aria-label={tg.rentangCandlestick} className="inline-flex border border-[var(--line)] bg-[var(--surface)] p-0.5 text-[10px] font-mono">
              {([7, 14, 30] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  aria-pressed={candleDays === days}
                  onClick={() => {
                    setCandleDays(days);
                    setCandleIdx(null);
                    setCandleCursor(null);
                    setFocusedCandle(null);
                  }}
                  className={`px-1.5 py-0.5 transition-colors duration-140 ${
                    candleDays === days
                      ? "bg-[var(--canvas)] text-[var(--ink)] font-semibold"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {tg.rentangHari(days)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {view === "candle" ? (
        <div>
          <div
            role="region"
            aria-label={tg.ariaLilin}
            tabIndex={0}
            className="w-full"
          >
            <div
              ref={candleChartRef}
              className="relative w-full"
              onPointerMove={(event) => arahkanCandle(event.clientX, event.clientY)}
              onPointerLeave={() => {
                if (focusedCandle === null) {
                  setCandleIdx(null);
                  setCandleCursor(null);
                }
              }}
            >
            <svg
              viewBox={`0 0 ${candleW} ${CANDLE_HEIGHT}`}
              className="diagram-animasi diagram-reveal block h-auto w-full max-w-full select-none"
              role="img"
              aria-label={tg.ariaLilin}
            >
              {[0, 25, 50, 75, 100].map((t) => {
                const yy = CANDLE_PLOT_BOTTOM - ((CANDLE_PLOT_BOTTOM - CANDLE_PLOT_TOP) * t) / 100;
                return (
                  <g key={t}>
                    <line x1={padL} x2={candleW - padR} y1={yy} y2={yy} stroke="var(--line)" strokeWidth="1" />
                    <text x={padL - 6} y={yy + 3.5} textAnchor="end" className="font-mono text-[10px] fill-[var(--ink-muted)]">
                      {t}%
                    </text>
                  </g>
                );
              })}

              <line x1={padL} x2={candleW - padR} y1={CANDLE_VOLUME_TOP - 8} y2={CANDLE_VOLUME_TOP - 8} stroke="var(--line)" strokeWidth="1" />

              {candles.map((c, i) => {
                const slot = candleInnerW / candleDays;
                const cx = padL + slot * (i + 0.5);
                const bw = slot * 0.56;
                const yc = (v: number) => CANDLE_PLOT_BOTTOM - ((CANDLE_PLOT_BOTTOM - CANDLE_PLOT_TOP) * v) / 100;
                const up = c.close >= c.open;
                const color = up ? UP : DOWN;
                const bodyTop = yc(Math.max(c.open, c.close));
                const bodyH = Math.max(Math.abs(yc(c.open) - yc(c.close)), 1.5);
                const idle = c.count === 0;
                const volumeHeight = (c.count / volumeMax) * (CANDLE_VOLUME_BOTTOM - CANDLE_VOLUME_TOP - 3);
                const aria = tg.ariaNilaiLilin(
                  fmtDay(c.date),
                  fmtPercent(c.open),
                  fmtPercent(c.high),
                  fmtPercent(c.low),
                  fmtPercent(c.close),
                  c.count,
                );
                return (
                  <g
                    key={`${candleDays}-${i}`}
                    opacity={idle ? 0.45 : 1}
                    className="diagram-animasi diagram-candle-reveal"
                    style={{ animationDelay: `${i * 28}ms` }}
                  >
                    {candleIdx === i && (
                      <rect x={cx - slot / 2} y={CANDLE_PLOT_TOP} width={slot} height={CANDLE_VOLUME_BOTTOM - CANDLE_PLOT_TOP} fill="var(--surface)" />
                    )}
                    <line x1={cx} x2={cx} y1={yc(c.high)} y2={yc(c.low)} stroke={color} strokeWidth="1.5" />
                    <rect x={cx - bw / 2} y={bodyTop} width={bw} height={bodyH} fill={color} />
                    {c.count > 0 && (
                      <rect
                        x={cx - bw / 2}
                        y={CANDLE_VOLUME_BOTTOM - volumeHeight}
                        width={bw}
                        height={volumeHeight}
                        fill={color}
                        opacity="0.72"
                      />
                    )}
                    {(i % Math.max(1, Math.ceil(candleDays / 7)) === 0 || i === candleDays - 1) && (
                      <text x={cx} y={CANDLE_DATE_Y} textAnchor="middle" className="font-mono text-[10px] fill-[var(--ink-muted)]">
                        {fmtDay(c.date)}
                      </text>
                    )}
                    <rect
                      x={cx - slot / 2}
                      y={CANDLE_PLOT_TOP}
                      width={slot}
                      height={CANDLE_VOLUME_BOTTOM - CANDLE_PLOT_TOP}
                      fill="transparent"
                      tabIndex={0}
                      role="img"
                      aria-label={aria}
                      aria-describedby={candleIdx === i ? "candle-detail-tooltip" : undefined}
                      onFocus={() => focusCandle(i)}
                      onBlur={() => {
                        setFocusedCandle(null);
                        setCandleIdx(null);
                        setCandleCursor(null);
                      }}
                    />
                  </g>
                );
              })}

              <line
                x1={padL}
                x2={candleW - padR}
                y1={CANDLE_VOLUME_BOTTOM}
                y2={CANDLE_VOLUME_BOTTOM}
                stroke="var(--line)"
                strokeWidth="1"
              />

              {candleIdx !== null && candleCursor && (() => {
                const slot = candleInnerW / candleDays;
                const cx = padL + slot * (candleIdx + 0.5);
                return (
                  <g pointerEvents="none">
                    <line x1={cx} x2={cx} y1={CANDLE_PLOT_TOP} y2={CANDLE_VOLUME_BOTTOM} stroke="var(--line-strong)" strokeWidth="1" strokeDasharray="3 3" />
                    {candleCursor.valueY !== null && (
                      <>
                        <line x1={padL} x2={candleW - padR} y1={candleCursor.valueY} y2={candleCursor.valueY} stroke="var(--line-strong)" strokeWidth="1" strokeDasharray="3 3" />
                        <circle cx={cx} cy={candleCursor.valueY} r="2.5" fill="var(--canvas)" stroke="var(--line-strong)" strokeWidth="1.25" />
                      </>
                    )}
                  </g>
                );
              })()}
            </svg>

            {candleIdx !== null && candleCursor && (
              <div
                id="candle-detail-tooltip"
                ref={candleTooltipRef}
                role="tooltip"
                className="diagram-animasi diagram-tooltip-reveal pointer-events-none absolute z-20 min-w-40 border border-[var(--line-strong)] bg-[var(--canvas)] px-2.5 py-2 text-xs"
                style={{
                  left: candleCursor.x,
                  top: (() => {
                    const height = candleChartRef.current?.clientHeight ?? 0;
                    const tooltipHeight = candleTooltipRef.current?.offsetHeight ?? 132;
                    const below = candleCursor.y + tooltipHeight + 12 <= height;
                    return below
                      ? candleCursor.y + 12
                      : Math.max(4, candleCursor.y - tooltipHeight - 12);
                  })(),
                  transform: candleCursor.flipX ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
                  boxShadow: "var(--shadow-overlay)",
                }}
              >
                <div
                  aria-label={`${fmtDay(candles[candleIdx].date)} ${tg.jumlahButir(candles[candleIdx].count)}`}
                  className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] text-[var(--ink-muted)]"
                >
                  <span>{fmtDay(candles[candleIdx].date)}</span>
                  <span className="inline-flex min-w-5 items-center justify-center rounded border border-[var(--line-strong)] bg-[var(--surface)] px-1 py-0.5 font-mono tabular-nums text-[var(--ink)]">
                    {candles[candleIdx].count}
                  </span>
                  <span>{tg.satuanButir(candles[candleIdx].count)}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                  {(
                    [
                      ["O", tg.buka, candles[candleIdx].open],
                      ["H", tg.tinggi, candles[candleIdx].high],
                      ["L", tg.rendah, candles[candleIdx].low],
                      ["C", tg.tutup, candles[candleIdx].close],
                    ] as const
                  ).map(([short, label, value]) => (
                    <div key={short} title={label} className="flex items-center justify-between gap-2 leading-5">
                      <span className="font-mono text-[var(--ink-muted)]">{short}</span>
                      <span className="font-mono tabular-nums text-[var(--ink)]">{fmtPercent(value)}%</span>
                    </div>
                  ))}
                </div>
                <div className="mt-1 border-t border-[var(--line)] pt-1">
                  {candleCursor.valueY !== null && (
                    <div className="flex items-center gap-3 leading-5">
                      <span className="w-3 font-mono text-[var(--ink-muted)]">Y</span>
                      <span className="text-[var(--ink)] flex-1">{tg.nilaiKursor}</span>
                      <span className="font-mono tabular-nums text-[var(--ink)]">
                        {fmtPercent(100 * (CANDLE_PLOT_BOTTOM - candleCursor.valueY) / (CANDLE_PLOT_BOTTOM - CANDLE_PLOT_TOP))}%
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 leading-5">
                    <span className="w-3 font-mono text-[var(--ink-muted)]">Δ</span>
                    <span className="text-[var(--ink)] flex-1">{tg.perubahan}</span>
                    <span className="font-mono tabular-nums" style={{ color: candles[candleIdx].close > candles[candleIdx].open ? UP : candles[candleIdx].close < candles[candleIdx].open ? DOWN : "var(--ink-muted)" }}>
                      {candles[candleIdx].close - candles[candleIdx].open > 0 ? "+" : ""}{fmtPercent(candles[candleIdx].close - candles[candleIdx].open)} {tg.poinPersentase}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 leading-5">
                    <span className="w-3 font-mono text-[var(--ink-muted)]">↕</span>
                    <span className="text-[var(--ink)] flex-1">{tg.rentang}</span>
                    <span className="font-mono tabular-nums text-[var(--ink)]">{fmtPercent(candles[candleIdx].high - candles[candleIdx].low)} {tg.poinPersentase}</span>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-1 text-[11px] text-[var(--ink-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: UP }} /> {tg.naik}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: DOWN }} /> {tg.turun}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: "var(--line-strong)" }} /> {tg.volumeButir}
            </span>
            <span>{tg.redup}</span>
          </div>
        </div>
      ) : (
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="diagram-animasi diagram-reveal w-full h-auto select-none"
          role="img"
          aria-label={tg.ariaGaris(DAYS)}
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

          {CATEGORIES.map((cat, categoryIndex) => {
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
                  className="diagram-animasi diagram-line-draw"
                  style={{ animationDelay: `${categoryIndex * 85}ms` }}
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
                    className="diagram-animasi diagram-point-reveal"
                    style={{ animationDelay: `${categoryIndex * 85 + i * 30}ms` }}
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
                <span className="text-[var(--ink)] flex-1">{tl.status[cat.key]}</span>
                <span className="font-mono tabular-nums text-[var(--ink)]">
                  {series[cat.key][hoverIdx]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      <div className="border border-[var(--line)] bg-[var(--surface)] p-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {CATEGORIES.map((cat) => {
            const count = stats[cat.key];
            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div
                key={cat.key}
                onMouseEnter={() => setHoveredKey(cat.key)}
                onMouseLeave={() => setHoveredKey(null)}
                className={`flex items-center gap-2 rounded px-2 py-1 cursor-pointer transition-colors duration-140 ${
                  hoveredKey === cat.key ? "bg-[var(--canvas)]" : ""
                }`}
              >
                <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-sm text-[var(--ink)] flex-1 truncate">{tl.status[cat.key]}</span>
                <span className="font-serif text-sm tabular-nums text-[var(--ink)]">{count}</span>
                <span className="font-mono text-[11px] tabular-nums text-[var(--ink-muted)] w-9 text-right">
                  {Math.round(pct)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-3 border-t border-[var(--line)] flex justify-between items-center text-xs text-[var(--ink-muted)]">
        <span>{tg.totalDiproses}</span>
        <span className="font-mono tabular-nums font-semibold text-[var(--ink)]">{stats.total}</span>
      </div>

      {view === "candle" && (
        <section className="border-t border-[var(--line)] pt-3" aria-label={tg.ringkasanRentang}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <h4 className="font-serif text-sm font-normal text-[var(--ink)]">{tg.ringkasanRentang}</h4>
            <span className="shrink-0 font-mono text-[10px] text-[var(--ink-muted)]">{tg.periodeRingkasan(candleDays)}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
            <span className="font-mono text-[10px] text-[var(--ink-muted)]">{tg.perubahanPenerimaan}</span>
            {candleAwal && candleAkhir ? (
              <span className="inline-flex flex-wrap items-center justify-end gap-1 font-mono text-[10px] tabular-nums text-[var(--ink)]">
                <span className="inline-flex items-center border border-[var(--line-strong)] bg-[var(--canvas)] px-1.5 py-0.5">
                  {fmtPercent(candleAwal.open)}%
                </span>
                <ArrowRight aria-hidden="true" size={12} strokeWidth={1.75} className="shrink-0 text-[var(--ink-muted)]" />
                <span className="inline-flex items-center border border-[var(--line-strong)] bg-[var(--canvas)] px-1.5 py-0.5">
                  {fmtPercent(candleAkhir.close)}%
                </span>
                <span aria-hidden="true" className="px-0.5 text-[var(--ink-muted)]">|</span>
                <span className="inline-flex items-center border border-[var(--line-strong)] bg-[var(--canvas)] px-1.5 py-0.5">
                  {deltaPenerimaan > 0 ? "+" : ""}{fmtPercent(deltaPenerimaan)} {tg.poinPersentase}
                </span>
              </span>
            ) : (
              <span className="font-mono text-xs text-[var(--ink-muted)]">{tg.tidakAda}</span>
            )}
          </div>
        </section>
      )}

      {view === "line" && (
        <section className="border-t border-[var(--line)] pt-3" aria-label={tg.ringkasanAktivitas}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <h4 className="font-serif text-sm font-normal text-[var(--ink)]">{tg.ringkasanAktivitas}</h4>
            <span className="shrink-0 font-mono text-[10px] text-[var(--ink-muted)]">{tg.periodeRingkasan(DAYS)}</span>
          </div>
          <dl className="grid grid-cols-1 gap-x-6 border border-[var(--line)] bg-[var(--surface)] p-3 sm:grid-cols-2">
            {ringkasanAktivitas.map((item) => (
              <div key={item.label} className="min-w-0 border-b border-[var(--line)] py-2">
                <dt className="font-mono text-[10px] text-[var(--ink-muted)]">{item.label}</dt>
                <dd className="mt-0.5 break-words font-mono text-xs tabular-nums text-[var(--ink)]">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
