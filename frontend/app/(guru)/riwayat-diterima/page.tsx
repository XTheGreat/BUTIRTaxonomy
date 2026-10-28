"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ButirTertunda } from "@/lib/types";
import { useFormat } from "@/lib/format";
import { useTeks } from "@/lib/teks";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Table, { Column } from "@/components/ui/Table";
import BloomChip from "@/components/ui/BloomChip";
import EmptyState from "@/components/ui/EmptyState";
import MathText from "@/components/ui/MathText";
import { susunNomorHalaman } from "@/lib/pagination";

const POLL_MS = 5000;
const BUTIR_PER_HALAMAN = 7;

export default function RiwayatDiterimaPage() {
  const t = useTeks().sistem.riwayatDiterima;
  const { waktu } = useFormat();
  const [items, setItems] = useState<ButirTertunda[]>([]);
  const [loading, setLoading] = useState(true);
  const [galat, setGalat] = useState("");
  const [halaman, setHalaman] = useState(1);

  useEffect(() => {
    let aktif = true;
    const muat = async () => {
      try {
        const data: ButirTertunda[] = await apiFetch("/api/butir/diterima");
        if (!aktif) return;
        setItems(Array.isArray(data) ? data : []);
        setGalat("");
      } catch (err: any) {
        if (aktif) setGalat(err.message || t.gagalMuat);
      } finally {
        if (aktif) setLoading(false);
      }
    };
    muat();
    const timer = setInterval(muat, POLL_MS);
    return () => {
      aktif = false;
      clearInterval(timer);
    };
  }, [t.gagalMuat]);

  const jumlahHalaman = Math.max(1, Math.ceil(items.length / BUTIR_PER_HALAMAN));
  const halamanAktif = Math.min(halaman, jumlahHalaman);
  const indeksAwal = (halamanAktif - 1) * BUTIR_PER_HALAMAN;
  const butirTerlihat = items.slice(indeksAwal, indeksAwal + BUTIR_PER_HALAMAN);
  const nomorHalaman = susunNomorHalaman(halamanAktif, jumlahHalaman);

  function bukaHalaman(berikut: number) {
    setHalaman(berikut);
    document.getElementById("riwayat-diterima")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const navigasiHalaman = jumlahHalaman > 1 && (
    <nav
      aria-label={t.navigasiHalaman}
      className="flex flex-wrap items-center justify-between gap-3 border-y border-[var(--line)] py-2.5"
    >
      <span className="text-xs text-[var(--ink-muted)] tabular-nums">
        {t.rentang(indeksAwal + 1, indeksAwal + butirTerlihat.length, items.length)}
      </span>
      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="!h-7 !w-7 !p-0 shrink-0"
          aria-label={t.sebelumnya}
          disabled={halamanAktif === 1}
          onClick={() => bukaHalaman(halamanAktif - 1)}
        >
          ‹
        </Button>
        <div role="group" aria-label={t.navigasiHalaman} className="flex items-center gap-0.5">
          {nomorHalaman.map((nomor, indeks) => typeof nomor === "number" ? (
            <button
              key={nomor}
              type="button"
              aria-label={t.halaman(nomor, jumlahHalaman)}
              aria-current={nomor === halamanAktif ? "page" : undefined}
              onClick={() => bukaHalaman(nomor)}
              className={`inline-flex h-7 min-w-6 items-center justify-center border px-1 font-mono text-xs tabular-nums transition-colors duration-[140ms] ${
                nomor === halamanAktif
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
                  : "border-[var(--line-strong)] bg-[var(--canvas)] text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
              }`}
            >
              {nomor}
            </button>
          ) : (
            <span key={`${nomor}-${indeks}`} className="px-1 text-xs text-[var(--ink-muted)]" aria-hidden="true">
              …
            </span>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="!h-7 !w-7 !p-0 shrink-0"
          aria-label={t.berikutnya}
          disabled={halamanAktif === jumlahHalaman}
          onClick={() => bukaHalaman(halamanAktif + 1)}
        >
          ›
        </Button>
      </div>
    </nav>
  );

  const columns: Column<ButirTertunda>[] = [
    {
      key: "no",
      header: "#",
      className: "font-mono text-xs text-[var(--ink-muted)] tabular-nums",
      render: (_b, i) => indeksAwal + i + 1,
    },
    {
      key: "pertanyaan",
      header: t.kolom.soal,
      className: "max-w-[420px]",
      render: (b) => (
        <span className="font-serif text-sm line-clamp-2">
          <MathText text={b.pertanyaan || ""} />
        </span>
      ),
    },
    {
      key: "kisi_kisi_label",
      header: t.kolom.kisiKisi,
      className: "max-w-[200px]",
      render: (b) => (
        <span className="font-serif line-clamp-2" title={b.kisi_kisi_label}>
          {b.kisi_kisi_label}
        </span>
      ),
    },
    { key: "level_bloom", header: t.kolom.bloom, render: (b) => <BloomChip level={b.level_bloom} /> },
    {
      key: "ronde_saat_ini",
      header: t.kolom.ronde,
      className: "font-mono text-xs tabular-nums",
      render: (b) => t.jumlahRonde(b.ronde_saat_ini),
    },
    {
      key: "updated_at",
      header: t.kolom.diterima,
      className: "text-xs text-[var(--ink-muted)] tabular-nums whitespace-nowrap",
      render: (b) => waktu(b.updated_at),
    },
    {
      key: "aksi",
      header: t.kolom.aksi,
      render: (b) => (
        <Link
          href={`/debat/${b.id}?dari=riwayat-diterima`}
          className="inline-flex items-center rounded px-2 py-1 font-sans text-xs font-medium text-[var(--accent-text)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]"
        >
          {t.lihatDebat}
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t.judul}
        description={t.deskripsi}
      />

      {galat && (
        <div role="alert" className="mb-4 text-xs leading-relaxed text-[var(--status-ditolak)]">
          {galat}
        </div>
      )}

      {loading ? (
        <p className="font-mono text-xs text-[var(--ink-muted)]">{t.memuat}</p>
      ) : items.length === 0 ? (
        <EmptyState
          title={t.kosongJudul}
          description={t.kosongDeskripsi}
        />
      ) : (
        <section id="riwayat-diterima" className="space-y-2">
          <Table data={butirTerlihat} columns={columns} />
          {navigasiHalaman}
        </section>
      )}
    </div>
  );
}
