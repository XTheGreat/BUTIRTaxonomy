"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
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
import { PackageOpen } from "lucide-react";
import { useTeks } from "@/lib/teks";

const BLOOM_BAR: Record<string, { fill: string; edge: string }> = {
  C1: { fill: "#edf6f9", edge: "#83c5be" },
  C2: { fill: "#83c5be", edge: "#5aa8a1" },
  C3: { fill: "#006d77", edge: "#006d77" },
  C4: { fill: "#ffddd2", edge: "#e29578" },
  C5: { fill: "#e29578", edge: "#c9754f" },
  C6: { fill: "#b5593a", edge: "#b5593a" },
};

export default function DashboardPage() {
  const user = getCurrentUser();
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
        <span className="font-serif text-sm text-[var(--ink)] line-clamp-1">
          {item.pertanyaan}
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
          className="text-xs text-[var(--accent)] hover:underline font-medium"
        >
          {t.kolom.telaahDebat}
        </Link>
      ),
    },
  ];

  const totalBloom = Object.values(bloomDist).reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader
        title={t.judul}
        description={t.deskripsi(user?.nama || t.pengajarDefault)}
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
                  stats.ditandai > 0 ? "text-[#8A5A00]" : "text-[var(--ink)]"
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
                <div className="flex items-end gap-1.5 sm:gap-2 h-[182px] px-1 sm:px-2">
                  {["C1", "C2", "C3", "C4", "C5", "C6"].map((level) => {
                    const count = bloomDist[level] || 0;
                    const maxCount = Math.max(...Object.values(bloomDist), 1);
                    const heightPct = (count / maxCount) * 100;
                    return (
                      <div
                        key={level}
                        className="flex-1 flex flex-col items-center justify-end h-full min-w-0"
                      >
                        {count > 0 && (
                          <span className="font-mono text-[11px] tabular-nums font-medium text-[var(--ink)] mb-1">
                            {count}
                          </span>
                        )}
                        <div
                          className="w-full transition-all duration-700 ease-out box-border"
                          style={{
                            height: count > 0 ? `${Math.max(heightPct, 8)}%` : "2px",
                            backgroundColor: count > 0 ? BLOOM_BAR[level].fill : "var(--line)",
                            border: count > 0 ? `1px solid ${BLOOM_BAR[level].edge}` : undefined,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-1.5 sm:gap-2 px-1 sm:px-2 mt-2 pt-2 border-t border-[var(--line)]">
                  {["C1", "C2", "C3", "C4", "C5", "C6"].map((level) => (
                    <div key={level} className="flex-1 text-center min-w-0" title={`${level} - ${BLOOM_LABELS[level]}`}>
                      <span className="font-mono text-[11px] font-semibold text-[var(--accent)] block">
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
              className="text-xs text-[var(--accent)] hover:underline font-medium"
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
