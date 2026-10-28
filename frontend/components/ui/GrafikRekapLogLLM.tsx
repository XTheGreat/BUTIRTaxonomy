import { useRef, useState } from "react";
import type { FocusEvent, PointerEvent } from "react";
import type { RingkasanLogLLM } from "@/lib/types";
import { WARNA_GRAFIK } from "@/lib/warnaGrafik";

type Rincian = RingkasanLogLLM["rincian"];
type NilaiKategori = { nama: string; permintaan: number };
type NilaiPenyedia = NilaiKategori & { sukses: number; gagal: number };
type IsiTooltip = { judul: string; baris: { label: string; nilai: string; warna?: string }[] };
type TooltipAktif = IsiTooltip & { x: number; y: number; balikX: boolean };
type TampilkanTooltip = (x: number, y: number, isi: IsiTooltip) => void;
type FokusTooltip = (target: Element, isi: IsiTooltip) => void;

export interface TeksGrafikRekapLogLLM {
  deskripsi: string;
  skala: string;
  penyedia: string;
  model: string;
  peran: string;
  lainnya: string;
  penyediaHint: string;
  modelHint: string;
  peranHint: string;
  ariaPenyedia: string;
  ariaModel: string;
  ariaPeran: string;
  berhasil: string;
  gagal: string;
  permintaan: string;
  warnaPenyedia: string;
  porsi: string;
  tingkatGagal: string;
}

interface Props {
  rincian: Rincian;
  labelPeran: Record<string, string>;
  teks: TeksGrafikRekapLogLLM;
  angka: (nilai: number) => string;
}

function kelompokkan(rincian: Rincian, dimensi: "provider" | "model", lainnya: string) {
  const jumlah = new Map<string, number>();
  for (const baris of rincian) {
    jumlah.set(baris[dimensi], (jumlah.get(baris[dimensi]) ?? 0) + baris.permintaan);
  }

  const semua = [...jumlah.entries()]
    .map(([nama, permintaan]) => ({ nama, permintaan }))
    .sort((a, b) => b.permintaan - a.permintaan || a.nama.localeCompare(b.nama));

  if (semua.length <= 5) return semua;
  const teratas = semua.slice(0, 4);
  const sisa = semua.slice(4).reduce((total, baris) => total + baris.permintaan, 0);
  return [...teratas, { nama: lainnya, permintaan: sisa }].sort(
    (a, b) => b.permintaan - a.permintaan || a.nama.localeCompare(b.nama),
  );
}

function hitungPenyedia(rincian: Rincian, lainnya: string): NilaiPenyedia[] {
  const jumlah = new Map<string, NilaiPenyedia>();
  for (const baris of rincian) {
    const nilai = jumlah.get(baris.provider) ?? { nama: baris.provider, permintaan: 0, sukses: 0, gagal: 0 };
    nilai.permintaan += baris.permintaan;
    nilai.sukses += baris.sukses;
    nilai.gagal += baris.gagal;
    jumlah.set(baris.provider, nilai);
  }

  const semua = [...jumlah.values()].sort(
    (a, b) => b.permintaan - a.permintaan || a.nama.localeCompare(b.nama),
  );
  if (semua.length <= 5) return semua;

  const teratas = semua.slice(0, 4);
  const sisanya = semua.slice(4).reduce(
    (jumlah, item) => ({
      nama: lainnya,
      permintaan: jumlah.permintaan + item.permintaan,
      sukses: jumlah.sukses + item.sukses,
      gagal: jumlah.gagal + item.gagal,
    }),
    { nama: lainnya, permintaan: 0, sukses: 0, gagal: 0 },
  );
  return [...teratas, sisanya].sort(
    (a, b) => b.permintaan - a.permintaan || a.nama.localeCompare(b.nama),
  );
}

type NilaiPeran = { nama: string; permintaan: number; sukses: number; gagal: number };

function hitungPeran(rincian: Rincian, labelPeran: Record<string, string>): NilaiPeran[] {
  const jumlah = new Map<string, { permintaan: number; sukses: number; gagal: number }>();
  for (const peran of Object.keys(labelPeran)) jumlah.set(peran, { permintaan: 0, sukses: 0, gagal: 0 });
  for (const baris of rincian) {
    const nilai = jumlah.get(baris.peran) ?? { permintaan: 0, sukses: 0, gagal: 0 };
    nilai.permintaan += baris.permintaan;
    nilai.sukses += baris.sukses;
    nilai.gagal += baris.gagal;
    jumlah.set(baris.peran, nilai);
  }
  return [...jumlah.entries()].map(([nama, nilai]) => ({ nama, ...nilai }));
}

const WARNA_KATEGORI = [
  "var(--bloom-c4)",
  "var(--bloom-c5)",
  "var(--bloom-c6)",
  WARNA_GRAFIK.tertunda,
  "#0F5F66",
];

function warnaIdentitasPenyedia(nama: string, indeks: number) {
  const id = nama.toLowerCase().replace(/[\s_-]/g, "");
  if (id.includes("bankai")) return "var(--bloom-c4)";
  if (id.includes("advance")) return "var(--bloom-c5)";
  if (id.includes("vpsmurah")) return "var(--bloom-c6)";
  return WARNA_KATEGORI[indeks % WARNA_KATEGORI.length];
}

function FunnelPenyedia({
  data,
  total,
  label,
  angka,
  teks,
  tampilkanTooltip,
  fokusTooltip,
  hapusTooltip,
}: {
  data: NilaiPenyedia[];
  total: number;
  label: string;
  angka: (nilai: number) => string;
  teks: Pick<TeksGrafikRekapLogLLM, "permintaan" | "berhasil" | "gagal" | "porsi" | "tingkatGagal">;
  tampilkanTooltip: TampilkanTooltip;
  fokusTooltip: FokusTooltip;
  hapusTooltip: () => void;
}) {
  const maksimum = Math.max(...data.map((item) => item.permintaan), 0);
  const tinggiBaris = 28;
  const plotHeight = data.length * tinggiBaris;
  const tengah = 170;
  const lebarMaks = 292;

  return (
    <svg className="mb-2 block h-auto w-full" viewBox={`0 0 340 ${plotHeight + 19}`} role="group" aria-label={label} onPointerLeave={hapusTooltip}>
      {data.map((item, index) => {
        const atas = maksimum > 0 ? Math.max(12, lebarMaks * (item.permintaan / maksimum)) : 12;
        const bawah = Math.max(10, atas * 0.84);
        const y = index * tinggiBaris + 1;
        const points = [
          `${tengah - atas / 2},${y}`,
          `${tengah + atas / 2},${y}`,
          `${tengah + bawah / 2},${y + 26}`,
          `${tengah - bawah / 2},${y + 26}`,
        ].join(" ");
        const porsi = total > 0 ? Math.round((item.permintaan / total) * 100) : 0;
        const gagalPersen = item.permintaan > 0 ? Math.round((item.gagal / item.permintaan) * 100) : 0;
        const info: IsiTooltip = {
          judul: item.nama,
          baris: [
            { label: teks.permintaan, nilai: angka(item.permintaan) },
            { label: teks.porsi, nilai: `${porsi}%` },
            { label: teks.berhasil, nilai: angka(item.sukses), warna: warnaIdentitasPenyedia(item.nama, index) },
            { label: teks.gagal, nilai: `${angka(item.gagal)} / ${gagalPersen}%`, warna: WARNA_GRAFIK.ditolak },
          ],
        };
        return (
          <polygon
            key={item.nama}
            className="diagram-animasi diagram-funnel-enter"
            points={points}
            fill={warnaIdentitasPenyedia(item.nama, index)}
            stroke="var(--canvas)"
            strokeWidth="1.5"
            style={{ animationDelay: `${index * 90}ms` }}
            tabIndex={0}
            role="img"
            aria-label={`${item.nama}: ${teks.permintaan} ${angka(item.permintaan)}, ${teks.porsi} ${porsi}%`}
            aria-describedby="llm-summary-tooltip"
            onPointerEnter={(event: PointerEvent<SVGPolygonElement>) => tampilkanTooltip(event.clientX, event.clientY, info)}
            onPointerMove={(event: PointerEvent<SVGPolygonElement>) => tampilkanTooltip(event.clientX, event.clientY, info)}
            onPointerLeave={hapusTooltip}
            onFocus={(event: FocusEvent<SVGPolygonElement>) => fokusTooltip(event.currentTarget, info)}
            onBlur={hapusTooltip}
          />
        );
      })}
      <line x1="20" x2="320" y1={plotHeight + 2} y2={plotHeight + 2} stroke="var(--line-strong)" />
      <text x="20" y={plotHeight + 15} fill="var(--ink-muted)" fontFamily="var(--font-mono)" fontSize="8">0%</text>
      <text x={tengah} y={plotHeight + 15} fill="var(--ink-muted)" fontFamily="var(--font-mono)" fontSize="8" textAnchor="middle">50%</text>
      <text x="320" y={plotHeight + 15} fill="var(--ink-muted)" fontFamily="var(--font-mono)" fontSize="8" textAnchor="end">100%</text>
    </svg>
  );
}

function lintasanIrisanPai(mulai: number, akhir: number) {
  const cx = 50;
  const cy = 50;
  const radius = 44;
  const sudutMulai = -Math.PI / 2 + mulai * Math.PI * 2;
  const sudutAkhir = -Math.PI / 2 + akhir * Math.PI * 2;
  const xMulai = cx + Math.cos(sudutMulai) * radius;
  const yMulai = cy + Math.sin(sudutMulai) * radius;
  const xAkhir = cx + Math.cos(sudutAkhir) * radius;
  const yAkhir = cy + Math.sin(sudutAkhir) * radius;
  const busurPanjang = akhir - mulai > 0.5 ? 1 : 0;
  return `M ${cx} ${cy} L ${xMulai} ${yMulai} A ${radius} ${radius} 0 ${busurPanjang} 1 ${xAkhir} ${yAkhir} Z`;
}

function PiePenyedia({
  data,
  total,
  angka,
  label,
  teks,
  tampilkanTooltip,
  fokusTooltip,
  hapusTooltip,
}: {
  data: NilaiPenyedia[];
  total: number;
  angka: (nilai: number) => string;
  label: string;
  teks: Pick<TeksGrafikRekapLogLLM, "berhasil" | "gagal" | "permintaan" | "warnaPenyedia" | "porsi" | "tingkatGagal">;
  tampilkanTooltip: TampilkanTooltip;
  fokusTooltip: FokusTooltip;
  hapusTooltip: () => void;
}) {
  return (
    <div>
      <FunnelPenyedia
        data={data}
        total={total}
        label={label}
        angka={angka}
        teks={teks}
        tampilkanTooltip={tampilkanTooltip}
        fokusTooltip={fokusTooltip}
        hapusTooltip={hapusTooltip}
      />
      <div className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-[var(--line)] pb-2 text-[9px]">
        <span className="text-[var(--ink-muted)]">{teks.warnaPenyedia}</span>
        <span className="flex items-center gap-1.5 text-[var(--status-ditolak)]">
          <span className="h-2 w-2" style={{ backgroundColor: WARNA_GRAFIK.ditolak }} aria-hidden="true" />
          {teks.gagal}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-x-1 gap-y-4">
        {data.map((item, index) => {
          const porsi = total > 0 ? Math.round((item.permintaan / total) * 100) : 0;
          const persenGagal = item.permintaan > 0 ? Math.round((item.gagal / item.permintaan) * 100) : 0;
          const porsiSukses = item.permintaan > 0 ? item.sukses / item.permintaan : 0;
          const warnaPenyedia = warnaIdentitasPenyedia(item.nama, index);
          const suksesPct = Math.round(porsiSukses * 100);
          const infoSukses: IsiTooltip = {
            judul: item.nama,
            baris: [
              { label: teks.berhasil, nilai: angka(item.sukses), warna: warnaPenyedia },
              { label: teks.porsi, nilai: `${suksesPct}% ${teks.permintaan}` },
              { label: teks.permintaan, nilai: angka(item.permintaan) },
            ],
          };
          const infoGagal: IsiTooltip = {
            judul: item.nama,
            baris: [
              { label: teks.gagal, nilai: angka(item.gagal), warna: WARNA_GRAFIK.ditolak },
              { label: teks.tingkatGagal, nilai: `${persenGagal}%` },
              { label: teks.permintaan, nilai: angka(item.permintaan) },
            ],
          };
          const atributHoverSukses = {
            tabIndex: 0,
            "aria-label": `${item.nama}: ${teks.berhasil} ${angka(item.sukses)}, ${teks.porsi} ${suksesPct}%`,
            "aria-describedby": "llm-summary-tooltip",
            onPointerEnter: (event: PointerEvent<SVGCircleElement>) => tampilkanTooltip(event.clientX, event.clientY, infoSukses),
            onPointerMove: (event: PointerEvent<SVGCircleElement>) => tampilkanTooltip(event.clientX, event.clientY, infoSukses),
            onPointerLeave: hapusTooltip,
            onFocus: (event: FocusEvent<SVGCircleElement>) => fokusTooltip(event.currentTarget, infoSukses),
            onBlur: hapusTooltip,
          };
          const atributHoverGagal = {
            tabIndex: 0,
            "aria-label": `${item.nama}: ${teks.gagal} ${angka(item.gagal)}, ${teks.tingkatGagal} ${persenGagal}%`,
            "aria-describedby": "llm-summary-tooltip",
            onPointerEnter: (event: PointerEvent<SVGCircleElement>) => tampilkanTooltip(event.clientX, event.clientY, infoGagal),
            onPointerMove: (event: PointerEvent<SVGCircleElement>) => tampilkanTooltip(event.clientX, event.clientY, infoGagal),
            onPointerLeave: hapusTooltip,
            onFocus: (event: FocusEvent<SVGCircleElement>) => fokusTooltip(event.currentTarget, infoGagal),
            onBlur: hapusTooltip,
          };
          return (
            <div key={item.nama} className="min-w-0 text-center">
              <svg
                className="diagram-animasi diagram-pie-enter mx-auto block h-[72px] w-[72px] max-w-full"
                style={{ animationDelay: `${index * 110}ms` }}
                viewBox="0 0 100 100"
                role="group"
                aria-label={`${item.nama}: ${teks.berhasil} ${angka(item.sukses)}, ${teks.gagal} ${angka(item.gagal)} (${persenGagal}%)`}
                onPointerLeave={hapusTooltip}
              >
                {item.permintaan === 0 ? (
                  <circle cx="50" cy="50" r="44" fill="var(--line-strong)" {...atributHoverSukses} />
                ) : item.gagal === 0 ? (
                  <circle cx="50" cy="50" r="44" fill={warnaPenyedia} {...atributHoverSukses} />
                ) : item.sukses === 0 ? (
                  <circle cx="50" cy="50" r="44" fill={WARNA_GRAFIK.ditolak} {...atributHoverGagal} />
                ) : (
                  <>
                    <path
                      d={lintasanIrisanPai(0, porsiSukses)}
                      fill={warnaPenyedia}
                      stroke="var(--canvas)"
                      strokeWidth="1.5"
                      tabIndex={0}
                      aria-label={`${item.nama}: ${teks.berhasil} ${angka(item.sukses)}, ${suksesPct}%`}
                      aria-describedby="llm-summary-tooltip"
                      onPointerEnter={(event: PointerEvent<SVGPathElement>) => tampilkanTooltip(event.clientX, event.clientY, infoSukses)}
                      onPointerMove={(event: PointerEvent<SVGPathElement>) => tampilkanTooltip(event.clientX, event.clientY, infoSukses)}
                      onPointerLeave={hapusTooltip}
                      onFocus={(event: FocusEvent<SVGPathElement>) => fokusTooltip(event.currentTarget, infoSukses)}
                      onBlur={hapusTooltip}
                    />
                    <path
                      d={lintasanIrisanPai(porsiSukses, 1)}
                      fill={WARNA_GRAFIK.ditolak}
                      stroke="var(--canvas)"
                      strokeWidth="1.5"
                      tabIndex={0}
                      aria-label={`${item.nama}: ${teks.gagal} ${angka(item.gagal)}, ${persenGagal}%`}
                      aria-describedby="llm-summary-tooltip"
                      onPointerEnter={(event: PointerEvent<SVGPathElement>) => tampilkanTooltip(event.clientX, event.clientY, infoGagal)}
                      onPointerMove={(event: PointerEvent<SVGPathElement>) => tampilkanTooltip(event.clientX, event.clientY, infoGagal)}
                      onPointerLeave={hapusTooltip}
                      onFocus={(event: FocusEvent<SVGPathElement>) => fokusTooltip(event.currentTarget, infoGagal)}
                      onBlur={hapusTooltip}
                    />
                  </>
                )}
                <circle cx="50" cy="50" r="44" fill="none" stroke="var(--line-strong)" strokeWidth="0.75" />
              </svg>
              <div className="mt-2 flex min-w-0 items-center justify-center gap-1.5 text-[10px] text-[var(--ink)]" title={item.nama}>
                <span className="h-2 w-2 shrink-0" style={{ backgroundColor: warnaPenyedia }} aria-hidden="true" />
                <span className="min-w-0 break-words">{item.nama}</span>
              </div>
              <p className="mt-1 font-mono text-[9px] tabular-nums text-[var(--ink-muted)]">
                {angka(item.permintaan)} / {porsi}%
              </p>
              <div className="mt-1 space-y-0.5 text-[9px] tabular-nums">
                <p className="text-[var(--ink-muted)]">{teks.berhasil} {angka(item.sukses)}</p>
                <p className="text-[var(--status-ditolak)]">{teks.gagal} {angka(item.gagal)} / {persenGagal}%</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RadarModel({
  data,
  total,
  angka,
  label,
  teks,
  tampilkanTooltip,
  fokusTooltip,
  hapusTooltip,
}: {
  data: NilaiKategori[];
  total: number;
  angka: (nilai: number) => string;
  label: string;
  teks: Pick<TeksGrafikRekapLogLLM, "permintaan" | "porsi">;
  tampilkanTooltip: TampilkanTooltip;
  fokusTooltip: FokusTooltip;
  hapusTooltip: () => void;
}) {
  const jumlahSumbu = Math.max(data.length, 1);
  const maksimum = Math.max(...data.map((item) => item.permintaan), 0);
  const cx = 160;
  const cy = 124;
  const radius = 78;
  const sudut = data.map((_, index) => (-Math.PI / 2) + (2 * Math.PI * index) / jumlahSumbu);
  const titikPada = (sudutTitik: number, jarak: number) => ({
    x: cx + Math.cos(sudutTitik) * jarak,
    y: cy + Math.sin(sudutTitik) * jarak,
  });
  const cincin = [0.25, 0.5, 0.75, 1].map((skala) =>
    sudut.map((arah) => {
      const titik = titikPada(arah, radius * skala);
      return `${titik.x},${titik.y}`;
    }).join(" "),
  );
  const nilaiTitik = data.map((item, index) =>
    titikPada(sudut[index], maksimum > 0 ? radius * (item.permintaan / maksimum) : 0),
  );
  const jalurData = nilaiTitik.map((titik) => `${titik.x},${titik.y}`).join(" ");

  return (
    <>
      <svg
        className="mx-auto block h-auto w-full max-w-[320px]"
        viewBox="0 0 320 250"
        role="group"
        aria-label={label}
        onPointerLeave={hapusTooltip}
      >
        {cincin.map((points, index) => (
          data.length >= 3 ? (
            <polygon key={index} points={points} fill="none" stroke="var(--line-strong)" strokeOpacity={index === 3 ? 0.65 : 0.42} strokeWidth="0.8" />
          ) : (
            <circle key={index} cx={cx} cy={cy} r={radius * (index + 1) / 4} fill="none" stroke="var(--line-strong)" strokeOpacity="0.45" strokeWidth="0.8" />
          )
        ))}
        {sudut.map((arah, index) => {
          const ujung = titikPada(arah, radius);
          const label = titikPada(arah, radius + 19);
          return (
            <g key={index}>
              <line x1={cx} y1={cy} x2={ujung.x} y2={ujung.y} stroke="var(--line-strong)" strokeOpacity="0.55" strokeWidth="0.8" />
              <text x={label.x} y={label.y + 3} textAnchor="middle" fill="var(--ink-muted)" fontFamily="var(--font-mono)" fontSize="9">
                {index + 1}
              </text>
            </g>
          );
        })}
        {data.length >= 3 ? (
          <polygon
            className="diagram-animasi diagram-radar-enter"
            style={{ animationDelay: "180ms" }}
            points={jalurData}
            fill={WARNA_GRAFIK.naik}
            fillOpacity="0.14"
            stroke={WARNA_GRAFIK.naik}
            strokeWidth="1.8"
          />
        ) : data.length === 2 ? (
          <polyline points={jalurData} fill="none" stroke={WARNA_GRAFIK.naik} strokeWidth="1.8" />
        ) : data.length === 1 ? (
          <line x1={cx} y1={cy} x2={nilaiTitik[0].x} y2={nilaiTitik[0].y} stroke={WARNA_GRAFIK.naik} strokeWidth="1.8" />
        ) : null}
        {nilaiTitik.map((titik, index) => {
          const porsi = total > 0 ? Math.round((data[index].permintaan / total) * 100) : 0;
          const info: IsiTooltip = {
            judul: data[index].nama,
            baris: [
              { label: teks.permintaan, nilai: angka(data[index].permintaan) },
              { label: teks.porsi, nilai: `${porsi}%` },
            ],
          };
          return (
            <circle
              key={data[index].nama}
              className="diagram-animasi diagram-point-reveal"
              style={{ animationDelay: `${320 + index * 75}ms` }}
              cx={titik.x}
              cy={titik.y}
              r="3.5"
              fill="var(--canvas)"
              stroke={WARNA_GRAFIK.naik}
              strokeWidth="1.8"
              tabIndex={0}
              aria-label={`${data[index].nama}: ${teks.permintaan} ${angka(data[index].permintaan)}, ${teks.porsi} ${porsi}%`}
              aria-describedby="llm-summary-tooltip"
              onPointerEnter={(event: PointerEvent<SVGCircleElement>) => tampilkanTooltip(event.clientX, event.clientY, info)}
              onPointerMove={(event: PointerEvent<SVGCircleElement>) => tampilkanTooltip(event.clientX, event.clientY, info)}
              onPointerLeave={hapusTooltip}
              onFocus={(event: FocusEvent<SVGCircleElement>) => fokusTooltip(event.currentTarget, info)}
              onBlur={hapusTooltip}
            />
          );
        })}
        <circle cx={cx} cy={cy} r="1.5" fill="var(--ink-muted)" />
      </svg>
      <div className="mt-1 grid grid-cols-1 gap-x-3 border-t border-[var(--line)] pt-2 sm:grid-cols-2">
        {data.map((item, index) => {
          const porsi = total > 0 ? Math.round((item.permintaan / total) * 100) : 0;
          return (
            <div key={item.nama} className="flex min-w-0 items-baseline justify-between gap-2 py-0.5 text-[10px]">
              <span className="flex min-w-0 items-baseline gap-1.5 text-[var(--ink)]" title={item.nama}>
                <span className="shrink-0 font-mono tabular-nums text-[var(--ink-muted)]">{index + 1}</span>
                <span className="truncate">{item.nama}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 font-mono tabular-nums text-[var(--ink-muted)]">
                {angka(item.permintaan)} |
                <span className="rounded border border-[var(--line-strong)] bg-[var(--canvas)] px-1 py-0.5 text-[var(--ink)]">
                  {porsi}%
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function BatangPeran({
  data,
  labelPeran,
  angka,
  ariaLabel,
  teks,
  tampilkanTooltip,
  fokusTooltip,
  hapusTooltip,
}: {
  data: NilaiPeran[];
  labelPeran: Record<string, string>;
  angka: (nilai: number) => string;
  ariaLabel: string;
  teks: Pick<TeksGrafikRekapLogLLM, "berhasil" | "gagal" | "permintaan" | "porsi" | "tingkatGagal">;
  tampilkanTooltip: TampilkanTooltip;
  fokusTooltip: FokusTooltip;
  hapusTooltip: () => void;
}) {
  return (
    <div role="group" aria-label={ariaLabel}>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 border-b border-[var(--line)] pb-2 text-[10px]">
        <span className="flex items-center gap-1.5 text-[var(--status-diterima)]">
          <span className="h-2 w-2" style={{ backgroundColor: WARNA_GRAFIK.diterima }} />
          {teks.berhasil}
        </span>
        <span className="flex items-center gap-1.5 text-[var(--status-ditolak)]">
          <span className="h-2 w-2" style={{ backgroundColor: WARNA_GRAFIK.ditolak }} />
          {teks.gagal}
        </span>
      </div>
      <div className="space-y-3">
        {data.map((item, index) => {
          const gagalPersen = item.permintaan > 0 ? Math.round((item.gagal / item.permintaan) * 100) : 0;
          const suksesLebar = item.permintaan > 0 ? (item.sukses / item.permintaan) * 100 : 0;
          const gagalLebar = item.permintaan > 0 ? (item.gagal / item.permintaan) * 100 : 0;
          const nama = labelPeran[item.nama] ?? item.nama;
          const info: IsiTooltip = {
            judul: nama,
            baris: [
              { label: teks.permintaan, nilai: angka(item.permintaan) },
              { label: teks.berhasil, nilai: angka(item.sukses), warna: WARNA_GRAFIK.diterima },
              { label: teks.gagal, nilai: angka(item.gagal), warna: WARNA_GRAFIK.ditolak },
              { label: teks.tingkatGagal, nilai: `${gagalPersen}%` },
            ],
          };
          return (
            <div key={item.nama}>
              <div className="mb-1 flex min-w-0 items-baseline justify-between gap-2 text-xs">
                <span className="truncate text-[var(--ink)]" title={nama}>{nama}</span>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--ink-muted)]">
                  {angka(item.permintaan)} {teks.permintaan}
                </span>
              </div>
              <div
                className="flex h-3 w-full overflow-hidden border border-[var(--line)] bg-[var(--canvas)]"
                role="img"
                tabIndex={0}
                aria-label={`${nama}: ${teks.berhasil} ${angka(item.sukses)}, ${teks.gagal} ${angka(item.gagal)} (${gagalPersen}%)`}
                aria-describedby="llm-summary-tooltip"
                onPointerEnter={(event: PointerEvent<HTMLDivElement>) => tampilkanTooltip(event.clientX, event.clientY, info)}
                onPointerMove={(event: PointerEvent<HTMLDivElement>) => tampilkanTooltip(event.clientX, event.clientY, info)}
                onPointerLeave={hapusTooltip}
                onFocus={(event: FocusEvent<HTMLDivElement>) => fokusTooltip(event.currentTarget, info)}
                onBlur={hapusTooltip}
              >
                <span
                  className="diagram-animasi diagram-segment-reveal h-full"
                  style={{ width: `${suksesLebar}%`, backgroundColor: WARNA_GRAFIK.diterima, animationDelay: `${index * 100}ms` }}
                />
                <span
                  className="diagram-animasi diagram-segment-reveal h-full"
                  style={{ width: `${gagalLebar}%`, backgroundColor: WARNA_GRAFIK.ditolak, animationDelay: `${index * 100 + 70}ms` }}
                />
              </div>
              <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-2 text-[9px] tabular-nums">
                <span className="text-[var(--status-diterima)]">{teks.berhasil} {angka(item.sukses)}</span>
                <span className="text-[var(--status-ditolak)]">{teks.gagal} {angka(item.gagal)} / {gagalPersen}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GrafikRekapLogLLM({ rincian, labelPeran, teks, angka }: Props) {
  const grafikRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipAktif | null>(null);

  const tampilkanTooltip: TampilkanTooltip = (clientX, clientY, isi) => {
    const batas = grafikRef.current?.getBoundingClientRect();
    if (!batas) return;
    const x = clientX - batas.left;
    setTooltip({
      ...isi,
      x,
      y: clientY - batas.top,
      balikX: x > batas.width / 2,
    });
  };
  const fokusTooltip: FokusTooltip = (target, isi) => {
    const batas = target.getBoundingClientRect();
    tampilkanTooltip(batas.left + batas.width / 2, batas.top + batas.height / 2, isi);
  };
  const hapusTooltip = () => setTooltip(null);

  const penyedia = hitungPenyedia(rincian, teks.lainnya);
  const model = kelompokkan(rincian, "model", teks.lainnya);
  const peran = hitungPeran(rincian, labelPeran);
  const total = rincian.reduce((jumlah, item) => jumlah + item.permintaan, 0);
  const kelompok = [
    { id: "penyedia", judul: teks.penyedia, hint: teks.penyediaHint },
    { id: "model", judul: teks.model, hint: teks.modelHint },
    { id: "peran", judul: teks.peran, hint: teks.peranHint },
  ] as const;

  return (
    <figure
      ref={grafikRef}
      className="relative mb-4 border border-[var(--line)] bg-[var(--surface)]"
      onPointerLeave={hapusTooltip}
    >
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-2 text-xs text-[var(--ink-muted)]">
        <span>{teks.deskripsi}</span>
        <span className="font-mono text-[10px] tracking-[0.04em]">{teks.skala}</span>
      </figcaption>
      <div className="grid grid-cols-1 divide-y divide-[var(--line)] lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        {kelompok.map((bagian, index) => (
          <section key={bagian.id} className="min-w-0 p-3">
            <div className="mb-2 border-b border-[var(--line)] pb-2">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="min-w-0 truncate font-mono text-[11px] font-semibold text-[var(--ink)]">
                  <span className="mr-2 text-[var(--ink-muted)]">{index + 1}.</span>
                  {bagian.judul}
                </h3>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--ink-muted)]">Σ {angka(total)}</span>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-[var(--ink-muted)]">{bagian.hint}</p>
            </div>
            {bagian.id === "penyedia" ? (
              <PiePenyedia
                data={penyedia}
                total={total}
                angka={angka}
                label={teks.ariaPenyedia}
                teks={teks}
                tampilkanTooltip={tampilkanTooltip}
                fokusTooltip={fokusTooltip}
                hapusTooltip={hapusTooltip}
              />
            ) : bagian.id === "model" ? (
              <RadarModel
                data={model}
                total={total}
                angka={angka}
                label={teks.ariaModel}
                teks={teks}
                tampilkanTooltip={tampilkanTooltip}
                fokusTooltip={fokusTooltip}
                hapusTooltip={hapusTooltip}
              />
            ) : (
              <BatangPeran
                data={peran}
                labelPeran={labelPeran}
                angka={angka}
                ariaLabel={teks.ariaPeran}
                teks={teks}
                tampilkanTooltip={tampilkanTooltip}
                fokusTooltip={fokusTooltip}
                hapusTooltip={hapusTooltip}
              />
            )}
          </section>
        ))}
      </div>
      {tooltip && (
        <div
          id="llm-summary-tooltip"
          ref={tooltipRef}
          role="tooltip"
          className="diagram-animasi diagram-tooltip-reveal pointer-events-none absolute z-30 min-w-44 max-w-60 border border-[var(--line-strong)] bg-[var(--canvas)] px-2.5 py-2 text-xs text-[var(--ink)]"
          style={{
            left: tooltip.x,
            top: (() => {
              const tinggiGrafik = grafikRef.current?.clientHeight ?? 0;
              const tinggiTooltip = tooltipRef.current?.offsetHeight ?? 112;
              const bawahCukup = tooltip.y + tinggiTooltip + 12 <= tinggiGrafik;
              return bawahCukup ? tooltip.y + 12 : Math.max(8, tooltip.y - tinggiTooltip - 12);
            })(),
            transform: tooltip.balikX ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
            boxShadow: "var(--shadow-overlay)",
          }}
        >
          <div className="mb-1.5 font-serif text-sm text-[var(--ink)]">{tooltip.judul}</div>
          <div className="space-y-0.5">
            {tooltip.baris.map((baris, index) => (
              <div key={`${baris.label}-${index}`} className="flex items-baseline justify-between gap-4 leading-5">
                <span className="flex min-w-0 items-center gap-1.5 text-[var(--ink-muted)]">
                  {baris.warna && <span className="h-2 w-2 shrink-0" style={{ backgroundColor: baris.warna }} aria-hidden="true" />}
                  <span>{baris.label}</span>
                </span>
                <span className="shrink-0 font-mono tabular-nums text-[var(--ink)]">{baris.nilai}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </figure>
  );
}
