"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ButirSoal } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import BloomChip from "@/components/ui/BloomChip";
import EmptyState from "@/components/ui/EmptyState";
import Table, { Column } from "@/components/ui/Table";
import RondeIndicator from "@/components/ui/RondeIndicator";
import Skeleton from "@/components/ui/Skeleton";
import DeliberasiLineChart from "@/components/ui/DeliberasiLineChart";
import MathText from "@/components/ui/MathText";
import { PackageOpen } from "lucide-react";
import { useTeks } from "@/lib/teks";

// Warna batang ada di app/globals.css (--bloom-batang-*) agar punya varian terang dan gelap.
const BLOOM_LEVELS = ["C1", "C2", "C3", "C4", "C5", "C6"];
const BLOOM_BAR: Record<string, { fill: string; edge: string }> = Object.fromEntries(
  BLOOM_LEVELS.map((level) => level.toLowerCase()).map((k) => [
    k.toUpperCase(),
    { fill: `var(--bloom-batang-${k})`, edge: `var(--bloom-batang-${k}-tepi)` },
  ])
);

export default function DashboardPage() {
  const { dashboard: t, komponen } = useTeks();
  const BLOOM_LABELS = komponen.bloom.tingkat;
  const [stats, setStats] = useState({
    materi: 0,
    bankSoal: 0,
    ditandai: 0,
    paketUjian: 0,
  });
  const [bloomDist, setBloomDist] = useState<Record<string, number>>({});
  const [debatStats, setDebatStats] = useState({
    diterima: 0,
    ditandai: 0,
    ditolak: 0,
    tertunda: 0,
    total: 0,
  });
  const [allButir, setAllButir] = useState<ButirSoal[]>([]);
  const [markedList, setMarkedList] = useState<ButirSoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [bloomDihover, setBloomDihover] = useState<string | null>(null);
  const [bloomDiFokus, setBloomDiFokus] = useState<string | null>(null);
  const [posisiTooltipBloom, setPosisiTooltipBloom] = useState<{
    x: number;
    y: number;
    balikX: boolean;
    balikY: boolean;
  } | null>(null);
  const grafikBloomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [materi, bank, ditandai, ujianList, allButir] = await Promise.all([
          apiFetch("/api/materi").catch(() => []),
          apiFetch("/api/bank-soal").catch(() => []),
          apiFetch("/api/butir?status=ditandai").catch(() => []),
          apiFetch("/api/ujian").catch(() => []),
          apiFetch("/api/butir").catch(() => []),
        ]);

        const materiArr = Array.isArray(materi) ? materi : [];
        const bankArr = Array.isArray(bank) ? bank : [];
        const ditandaiArr = Array.isArray(ditandai) ? ditandai : [];
        const ujianArr = Array.isArray(ujianList) ? ujianList : [];
        const allButirArr = Array.isArray(allButir) ? allButir : [];

        setStats({
          materi: materiArr.length,
          bankSoal: bankArr.length,
          ditandai: ditandaiArr.length,
          paketUjian: ujianArr.length,
        });

        if (ditandaiArr.length > 0) {
          setMarkedList(ditandaiArr.slice(0, 5));
        }

        const bloom: Record<string, number> = {};
        bankArr.forEach((b: ButirSoal) => {
          const lvl = b.level_bloom || "C1";
          bloom[lvl] = (bloom[lvl] || 0) + 1;
        });
        setBloomDist(bloom);

        const dStats = { diterima: 0, ditandai: 0, ditolak: 0, tertunda: 0, total: allButirArr.length };
        allButirArr.forEach((b: ButirSoal) => {
          if (b.status === "diterima") dStats.diterima++;
          else if (b.status === "ditandai") dStats.ditandai++;
          else if (b.status === "ditolak") dStats.ditolak++;
          else if (b.status === "tertunda") dStats.tertunda++;
        });
        setDebatStats(dStats);
        setAllButir(allButirArr);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const markedColumns: Column<ButirSoal>[] = [
    {
      key: "id",
      header: "#",
      className: "font-mono text-xs text-[var(--ink-muted)] w-12",
      render: (_, idx) => idx + 1,
    },
    {
      key: "pertanyaan",
      header: t.kolom.pertanyaan,
      className: "max-w-md",
      render: (item) => (
        <span className="font-serif text-sm text-[var(--ink)] line-clamp-2">
          <MathText text={item.pertanyaan || ""} />
        </span>
      ),
    },
    {
      key: "level_bloom",
      header: t.kolom.bloom,
      className: "w-20",
      render: (item) => <BloomChip level={item.level_bloom} />,
    },
    {
      key: "status",
      header: t.kolom.status,
      className: "w-28",
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "ronde_saat_ini",
      header: t.kolom.ronde,
      className: "w-36",
      render: (item) => <RondeIndicator ronde={item.ronde_saat_ini} />,
    },
    {
      key: "aksi",
      header: "",
      className: "w-28 text-right",
      render: (item) => (
        <Link
          href={`/butir-ditandai/${item.id}`}
          className="text-xs text-[var(--accent-text)] hover:underline font-medium"
        >
          {t.kolom.telaahDebat}
        </Link>
      ),
    },
  ];

  const totalBloom = Object.values(bloomDist).reduce((a, b) => a + b, 0);
  const bloomRingkasan = BLOOM_LEVELS.map((level) => ({
    level,
    count: bloomDist[level] || 0,
    percentage: totalBloom > 0 ? Math.round(((bloomDist[level] || 0) / totalBloom) * 100) : 0,
  }));
  const bloomTerbanyak = bloomRingkasan.filter((item) => item.count === Math.max(...bloomRingkasan.map((item) => item.count)));
  const bloomTerendah = bloomRingkasan.filter((item) => item.count > 0);
  const jumlahBloomTerendah = Math.min(...bloomTerendah.map((item) => item.count));
  const bloomPalingSedikit = bloomTerendah.filter((item) => item.count === jumlahBloomTerendah);
  const bloomPuncakSamaDenganMinimum = bloomTerbanyak.length === bloomPalingSedikit.length
    && bloomTerbanyak.every((item, index) => item.level === bloomPalingSedikit[index]?.level);
  const bloomBelumAda = bloomRingkasan.filter((item) => item.count === 0);
  const bloomSorotan = [
    { key: "terbanyak", label: t.distribusiBloom.terbanyak, items: bloomTerbanyak },
    ...(!bloomPuncakSamaDenganMinimum
      ? [{ key: "tersedikit", label: t.distribusiBloom.tersedikit, items: bloomPalingSedikit }]
      : []),
    ...(bloomBelumAda.length > 0
      ? [{ key: "belumAda", label: t.distribusiBloom.belumAda, items: bloomBelumAda }]
      : []),
  ];
  const bloomDisorot = bloomDihover ?? bloomDiFokus;

  function aturPosisiTooltipBloom(x: number, y: number) {
    const batas = grafikBloomRef.current?.getBoundingClientRect();
    if (!batas) return;
    setPosisiTooltipBloom({
      x: x - batas.left,
      y: y - batas.top,
      balikX: x > batas.left + batas.width / 2,
      balikY: y > batas.top + batas.height / 2,
    });
  }

  function arahkanTooltipBloom(event: MouseEvent<HTMLDivElement>) {
    aturPosisiTooltipBloom(event.clientX, event.clientY);
  }

  return (
    <div>
      <PageHeader
        title={t.judul}
        description={t.deskripsi}
        action={
          <Link href="/kisi-kisi">
            <Button size="sm">{t.buatKisiKisi}</Button>
          </Link>
        }
      />

      {loading ? (
        <div className="border border-[var(--line)] bg-[var(--surface)] mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`p-4 sm:p-5 lg:p-6 space-y-3 ${
                  i === 0
                    ? "border-r border-b lg:border-b-0 border-[var(--line)]"
                    : i === 1
                    ? "border-b lg:border-b-0 lg:border-r border-[var(--line)]"
                    : i === 2
                    ? "border-r border-[var(--line)]"
                    : ""
                }`}
              >
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-14" />
                <Skeleton className="h-2.5 w-32" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border border-[var(--line)] bg-[var(--surface)] mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            <div className="p-4 sm:p-5 lg:p-6 border-r border-b lg:border-b-0 border-[var(--line)]">
              <div className="text-xs font-medium text-[var(--ink-muted)] font-sans mb-1.5">
                {t.statistik.materi.judul}
              </div>
              <div className="font-serif text-3xl sm:text-4xl font-normal text-[var(--ink)] tabular-nums">
                {stats.materi}
              </div>
              <p className="text-xs text-[var(--ink-muted)] mt-1.5 leading-snug">
                {t.statistik.materi.ket}
              </p>
            </div>

            <div className="p-4 sm:p-5 lg:p-6 border-b lg:border-b-0 lg:border-r border-[var(--line)]">
              <div className="text-xs font-medium text-[var(--ink-muted)] font-sans mb-1.5">
                {t.statistik.bankSoal.judul}
              </div>
              <div className="font-serif text-3xl sm:text-4xl font-normal text-[var(--ink)] tabular-nums">
                {stats.bankSoal}
              </div>
              <p className="text-xs text-[var(--ink-muted)] mt-1.5 leading-snug">
                {t.statistik.bankSoal.ket}
              </p>
            </div>

            <div className="p-4 sm:p-5 lg:p-6 border-r border-[var(--line)]">
              <div className="text-xs font-medium text-[var(--ink-muted)] font-sans mb-1.5">
                {t.statistik.perluTindakan.judul}
              </div>
              <div
                className={`font-serif text-3xl sm:text-4xl font-normal tabular-nums ${
                  stats.ditandai > 0 ? "text-[var(--status-ditandai)]" : "text-[var(--ink)]"
                }`}
              >
                {stats.ditandai}
              </div>
              <p className="text-xs text-[var(--ink-muted)] mt-1.5 leading-snug">
                {t.statistik.perluTindakan.ket}
              </p>
            </div>

            <div className="p-4 sm:p-5 lg:p-6">
              <div className="text-xs font-medium text-[var(--ink-muted)] font-sans mb-1.5">
                {t.statistik.paketUjian.judul}
              </div>
              <div className="font-serif text-3xl sm:text-4xl font-normal text-[var(--ink)] tabular-nums">
                {stats.paketUjian}
              </div>
              <p className="text-xs text-[var(--ink-muted)] mt-1.5 leading-snug">
                {t.statistik.paketUjian.ket}
              </p>
            </div>
          </div>
        </div>
      )}

      {!loading && debatStats.total > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="border border-[var(--line)] bg-[var(--canvas)] p-4 sm:p-5 min-w-0">
            <DeliberasiLineChart stats={debatStats} butir={allButir} />
          </div>

          <div className="border border-[var(--line)] bg-[var(--canvas)] p-4 sm:p-5 min-w-0">
            <h3 className="font-serif text-base font-normal text-[var(--ink)] mb-1">
              {t.distribusiBloom.judul}
            </h3>
            <p className="text-xs text-[var(--ink-muted)] mb-5">
              {t.distribusiBloom.deskripsi}
            </p>
            {totalBloom === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-xs text-[var(--ink-muted)] gap-2 select-none">
                <PackageOpen
                  size={40}
                  strokeWidth={1.25}
                  className="text-[var(--ink-muted)]/65"
                />
                <span>{t.distribusiBloom.kosong}</span>
              </div>
            ) : (
              <>
                <div
                  ref={grafikBloomRef}
                  onMouseLeave={() => {
                    setBloomDihover(null);
                    if (!bloomDiFokus) setPosisiTooltipBloom(null);
                  }}
                  className="relative flex items-end gap-1.5 sm:gap-2 h-[182px] px-1 sm:px-2"
                >
                  {bloomDisorot && (() => {
                    const index = BLOOM_LEVELS.indexOf(bloomDisorot);
                    const count = bloomDist[bloomDisorot] || 0;
                    const percentage = Math.round((count / totalBloom) * 100);
                    return (
                      <div
                        key={bloomDisorot}
                        id="dashboard-bloom-tooltip"
                        role="tooltip"
                        className="diagram-animasi diagram-tooltip-reveal pointer-events-none absolute z-20 min-w-40 border border-[var(--line-strong)] bg-[var(--canvas)] px-2.5 py-2 text-xs text-[var(--ink)]"
                        style={{
                          left: posisiTooltipBloom?.x ?? `${((index + 0.5) / BLOOM_LEVELS.length) * 100}%`,
                          top: posisiTooltipBloom?.y ?? 0,
                          transform: posisiTooltipBloom
                            ? `${posisiTooltipBloom.balikX ? "translateX(calc(-100% - 12px))" : "translateX(12px)"} ${posisiTooltipBloom.balikY ? "translateY(calc(-100% - 12px))" : "translateY(12px)"}`
                            : index >= BLOOM_LEVELS.length / 2
                              ? "translateX(calc(-100% - 8px))"
                              : "translateX(8px)",
                          boxShadow: "var(--shadow-overlay)",
                        }}
                      >
                        <div className="mb-1 font-medium">
                          {bloomDisorot} | {BLOOM_LABELS[bloomDisorot]}
                        </div>
                        <div className="flex items-baseline justify-between gap-4">
                          <span className="text-[var(--ink-muted)]">{t.distribusiBloom.jumlahButir}</span>
                          <span className="font-mono tabular-nums">{count}</span>
                        </div>
                        <div className="flex items-baseline justify-between gap-4">
                          <span className="text-[var(--ink-muted)]">{t.distribusiBloom.persentase}</span>
                          <span className="font-mono tabular-nums">{percentage}% ({count}/{totalBloom})</span>
                        </div>
                      </div>
                    );
                  })()}
                  {BLOOM_LEVELS.map((level, index) => {
                    const count = bloomDist[level] || 0;
                    const maxCount = Math.max(...Object.values(bloomDist), 1);
                    const heightPct = (count / maxCount) * 100;
                    const percentage = Math.round((count / totalBloom) * 100);
                    return (
                      <div
                        key={level}
                        role="img"
                        tabIndex={0}
                        aria-label={`${level}, ${BLOOM_LABELS[level]}, ${t.distribusiBloom.jumlahButir}: ${count}, ${t.distribusiBloom.persentase}: ${percentage}%`}
                        aria-describedby={bloomDisorot === level ? "dashboard-bloom-tooltip" : undefined}
                        onMouseEnter={() => setBloomDihover(level)}
                        onMouseMove={arahkanTooltipBloom}
                        onFocus={(event) => {
                          setBloomDiFokus(level);
                          const batas = event.currentTarget.getBoundingClientRect();
                          aturPosisiTooltipBloom(batas.left + batas.width / 2, batas.top + batas.height / 2);
                        }}
                        onBlur={() => setBloomDiFokus(null)}
                        className="group flex-1 flex flex-col items-center justify-end h-full min-w-0 cursor-help outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]"
                      >
                        {count > 0 && (
                          <span className="font-mono text-[11px] tabular-nums font-medium text-[var(--ink)] mb-1">
                            {count}
                          </span>
                        )}
                        <div
                          className="diagram-animasi diagram-column-reveal w-full transition-all duration-700 ease-out box-border"
                          style={{
                            height: count > 0 ? `${Math.max(heightPct, 8)}%` : "2px",
                            backgroundColor: count > 0 ? BLOOM_BAR[level].fill : "var(--line)",
                            border: count > 0
                              ? `1px solid ${bloomDisorot === level ? "var(--accent-text)" : BLOOM_BAR[level].edge}`
                              : undefined,
                            outline: bloomDisorot === level ? "1px solid var(--accent-text)" : undefined,
                            outlineOffset: bloomDisorot === level ? 2 : undefined,
                            animationDelay: `${index * 60}ms`,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-1.5 sm:gap-2 px-1 sm:px-2 mt-2 pt-2 border-t border-[var(--line)]">
                  {["C1", "C2", "C3", "C4", "C5", "C6"].map((level) => (
                    <div key={level} className="flex-1 text-center min-w-0" title={`${level} - ${BLOOM_LABELS[level]}`}>
                      <span className="font-mono text-[11px] font-semibold text-[var(--accent-text)] block">
                        {level}
                      </span>
                      <span className="text-[10px] text-[var(--ink-muted)] block truncate leading-tight mt-0.5">
                        {BLOOM_LABELS[level]}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-[var(--line)] flex justify-between text-xs text-[var(--ink-muted)]">
                  <span>{t.distribusiBloom.total}</span>
                  <span className="font-mono tabular-nums font-medium text-[var(--ink)]">
                    {totalBloom}
                  </span>
                </div>

                <section aria-labelledby="ringkasan-bloom" className="mt-5 pt-4 border-t border-[var(--line)]">
                  <h4 id="ringkasan-bloom" className="text-xs font-medium text-[var(--ink-muted)]">
                    {t.distribusiBloom.ringkasan}
                  </h4>
                  <div className="mt-2.5 border border-[var(--line)] bg-[var(--surface)] p-2.5">
                    <table className="w-full table-fixed border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-[var(--line)] text-[10px] text-[var(--ink-muted)]">
                          <th scope="col" className="w-[31%] py-1.5 pr-2 font-normal">{t.distribusiBloom.kolomSorotan}</th>
                          <th scope="col" className="w-[39%] py-1.5 px-2 font-normal">{t.distribusiBloom.kolomLevel}</th>
                          <th scope="col" className="w-[30%] py-1.5 pl-2 text-right font-normal">{t.distribusiBloom.kolomPorsi}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bloomSorotan.map((sorotan) => {
                          const nilai = sorotan.items[0];
                          return (
                            <tr key={sorotan.key} className="border-b border-[var(--line)] last:border-b-0">
                              <th scope="row" className="py-2.5 pr-2 text-left font-normal text-[var(--ink)] align-top">
                                <span className="leading-snug">{sorotan.label}</span>
                              </th>
                              <td className="py-2.5 px-2 leading-snug align-top">
                                <div className="flex flex-wrap gap-x-2 gap-y-1">
                                  {sorotan.items.map(({ level }) => (
                                    <span key={level}>
                                      <span className="font-mono text-[11px] font-semibold text-[var(--accent-text)]">{level}</span>
                                      <span className="ml-1 text-[var(--ink)]">{BLOOM_LABELS[level]}</span>
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-2.5 pl-2 text-right font-mono text-[10px] tabular-nums text-[var(--ink-muted)] leading-snug align-top">
                                <span className="inline-flex flex-wrap items-center justify-end gap-x-1.5 gap-y-0.5">
                                  <span>{t.distribusiBloom.jumlahTiapLevel(nilai?.count || 0)}</span>
                                  {t.distribusiBloom.prefixPersentaseTiapLevel && (
                                    <span>{t.distribusiBloom.prefixPersentaseTiapLevel}</span>
                                  )}
                                  <span className="inline-flex items-center rounded border border-[var(--line)] bg-[var(--canvas)] px-1 py-0.5 font-semibold text-[var(--accent-text)]">
                                    {nilai?.percentage || 0}%
                                  </span>
                                  {t.distribusiBloom.suffixPersentaseTiapLevel && (
                                    <span>{t.distribusiBloom.suffixPersentaseTiapLevel}</span>
                                  )}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-baseline justify-between border-b border-[var(--line)] pb-2">
          <div>
            <h2 className="font-serif text-lg font-normal text-[var(--ink)] tracking-tight">
              {t.perluTindakan.judul}
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              {t.perluTindakan.deskripsi}
            </p>
          </div>
          {markedList.length > 0 && (
            <Link
              href="/butir-ditandai"
              className="text-xs text-[var(--accent-text)] hover:underline font-medium"
            >
              {t.perluTindakan.lihatSemua(stats.ditandai)}
            </Link>
          )}
        </div>

        {markedList.length === 0 ? (
          <EmptyState
            title={t.perluTindakan.kosongJudul}
            description={t.perluTindakan.kosongDeskripsi}
            className="py-14 sm:py-16 min-h-[220px] sm:min-h-[250px] flex flex-col justify-center items-center"
            action={
              <div className="flex gap-2.5 justify-center mt-2">
                <Link href="/kisi-kisi">
                  <Button size="sm">{t.perluTindakan.mulaiSesi}</Button>
                </Link>
                <Link href="/bank-soal">
                  <Button size="sm" variant="secondary">
                    {t.perluTindakan.periksaBank}
                  </Button>
                </Link>
              </div>
            }
          />
        ) : (
          <Table columns={markedColumns} data={markedList} />
        )}
      </section>
    </div>
  );
}
