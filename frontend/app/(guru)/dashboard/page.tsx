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

const BLOOM_LABELS: Record<string, string> = {
  C1: "Mengingat",
  C2: "Memahami",
  C3: "Menerapkan",
  C4: "Menganalisis",
  C5: "Mengevaluasi",
  C6: "Mencipta",
};

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
      header: "Pertanyaan",
      className: "max-w-md",
      render: (item) => (
        <span className="font-serif text-sm text-[var(--ink)] line-clamp-1">
          {item.pertanyaan}
        </span>
      ),
    },
    {
      key: "level_bloom",
      header: "Bloom",
      className: "w-20",
      render: (item) => <BloomChip level={item.level_bloom} />,
    },
    {
      key: "status",
      header: "Status",
      className: "w-28",
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "ronde_saat_ini",
      header: "Ronde",
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
          Telaah Debat
        </Link>
      ),
    },
  ];

  const totalBloom = Object.values(bloomDist).reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader
        title="Dashboard Naskah"
        description={`Lembar kerja telaah dan validasi butir soal. Selamat bertugas, ${
          user?.nama || "Pengajar"
        }.`}
        action={
          <Link href="/kisi-kisi">
            <Button size="sm">Buat Kisi-kisi</Button>
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
                Materi Ajar
              </div>
              <div className="font-serif text-3xl sm:text-4xl font-normal text-[var(--ink)] tabular-nums">
                {stats.materi}
              </div>
              <p className="text-xs text-[var(--ink-muted)] mt-1.5 leading-snug">
                Dokumen kurikulum tersimpan
              </p>
            </div>

            <div className="p-4 sm:p-5 lg:p-6 border-b lg:border-b-0 lg:border-r border-[var(--line)]">
              <div className="text-xs font-medium text-[var(--ink-muted)] font-sans mb-1.5">
                Bank Soal
              </div>
              <div className="font-serif text-3xl sm:text-4xl font-normal text-[var(--ink)] tabular-nums">
                {stats.bankSoal}
              </div>
              <p className="text-xs text-[var(--ink-muted)] mt-1.5 leading-snug">
                Butir tervalidasi siap pakai
              </p>
            </div>

            <div className="p-4 sm:p-5 lg:p-6 border-r border-[var(--line)]">
              <div className="text-xs font-medium text-[var(--ink-muted)] font-sans mb-1.5">
                Perlu Tindakan
              </div>
              <div
                className={`font-serif text-3xl sm:text-4xl font-normal tabular-nums ${
                  stats.ditandai > 0 ? "text-[#8A5A00]" : "text-[var(--ink)]"
                }`}
              >
                {stats.ditandai}
              </div>
              <p className="text-xs text-[var(--ink-muted)] mt-1.5 leading-snug">
                Butir menunggu keputusan manual
              </p>
            </div>

            <div className="p-4 sm:p-5 lg:p-6">
              <div className="text-xs font-medium text-[var(--ink-muted)] font-sans mb-1.5">
                Paket Ujian
              </div>
              <div className="font-serif text-3xl sm:text-4xl font-normal text-[var(--ink)] tabular-nums">
                {stats.paketUjian}
              </div>
              <p className="text-xs text-[var(--ink-muted)] mt-1.5 leading-snug">
                Paket tersusun (draft & aktif)
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
              Distribusi Bloom | Bank Soal
            </h3>
            <p className="text-xs text-[var(--ink-muted)] mb-5">
              Persebaran tingkat kognitif dari seluruh butir yang telah diterima.
            </p>
            {totalBloom === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-xs text-[var(--ink-muted)] gap-2 select-none">
                <PackageOpen
                  size={40}
                  strokeWidth={1.25}
                  className="text-[var(--ink-muted)]/65"
                />
                <span>Belum ada butir di bank soal.</span>
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
                  <span>Total butir di bank soal</span>
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
              Perlu Tindakan
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Daftar butir soal yang tidak mencapai konsensus agen dan membutuhkan verifikasi
            </p>
          </div>
          {markedList.length > 0 && (
            <Link
              href="/butir-ditandai"
              className="text-xs text-[var(--accent)] hover:underline font-medium"
            >
              Lihat semua ({stats.ditandai})
            </Link>
          )}
        </div>

        {markedList.length === 0 ? (
          <EmptyState
            title="Tidak ada butir yang menunggu tindakan"
            description="Semua butir soal dari sesi debat terkini telah tervalidasi atau belum ada proses generasi yang aktif."
            className="py-14 sm:py-16 min-h-[220px] sm:min-h-[250px] flex flex-col justify-center items-center"
            action={
              <div className="flex gap-2.5 justify-center mt-2">
                <Link href="/kisi-kisi">
                  <Button size="sm">Mulai Sesi Baru</Button>
                </Link>
                <Link href="/bank-soal">
                  <Button size="sm" variant="secondary">
                    Periksa Bank Soal
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
