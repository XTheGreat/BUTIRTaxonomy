"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ButirTertunda } from "@/lib/types";
import { formatWaktu } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import Table, { Column } from "@/components/ui/Table";
import BloomChip from "@/components/ui/BloomChip";
import EmptyState from "@/components/ui/EmptyState";
import MathText from "@/components/ui/MathText";

const POLL_MS = 5000;

export default function RiwayatDiterimaPage() {
  const [items, setItems] = useState<ButirTertunda[]>([]);
  const [loading, setLoading] = useState(true);
  const [galat, setGalat] = useState("");

  useEffect(() => {
    let aktif = true;
    const muat = async () => {
      try {
        const data: ButirTertunda[] = await apiFetch("/api/butir/diterima");
        if (!aktif) return;
        setItems(Array.isArray(data) ? data : []);
        setGalat("");
      } catch (err: any) {
        if (aktif) setGalat(err.message || "Gagal memuat riwayat.");
      } finally {
        if (aktif) setLoading(false);
      }
    };
    muat();
    const t = setInterval(muat, POLL_MS);
    return () => {
      aktif = false;
      clearInterval(t);
    };
  }, []);

  const columns: Column<ButirTertunda>[] = [
    {
      key: "no",
      header: "#",
      className: "font-mono text-xs text-[var(--ink-muted)] tabular-nums",
      render: (_b, i) => i + 1,
    },
    {
      key: "pertanyaan",
      header: "Soal",
      className: "max-w-[420px]",
      render: (b) => (
        <span className="font-serif text-sm line-clamp-2">
          <MathText text={b.pertanyaan || ""} />
        </span>
      ),
    },
    {
      key: "kisi_kisi_label",
      header: "Kisi-kisi",
      className: "max-w-[200px]",
      render: (b) => (
        <span className="font-serif line-clamp-2" title={b.kisi_kisi_label}>
          {b.kisi_kisi_label}
        </span>
      ),
    },
    { key: "level_bloom", header: "Bloom", render: (b) => <BloomChip level={b.level_bloom} /> },
    {
      key: "ronde_saat_ini",
      header: "Ronde",
      className: "font-mono text-xs tabular-nums",
      render: (b) => `${b.ronde_saat_ini} ronde`,
    },
    {
      key: "updated_at",
      header: "Diterima",
      className: "text-xs text-[var(--ink-muted)] tabular-nums whitespace-nowrap",
      render: (b) => formatWaktu(b.updated_at),
    },
    {
      key: "aksi",
      header: "Aksi",
      render: (b) => (
        <Link
          href={`/debat/${b.id}?dari=riwayat-diterima`}
          className="inline-flex items-center rounded px-2 py-1 font-sans text-xs font-medium text-[var(--accent)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          Lihat debat
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Riwayat Butir Diterima"
        description="Setiap butir tercatat di sini begitu diterima, bahkan saat generasi kisi-kisi masih berjalan. Buka debatnya untuk melihat soal dan jawaban tiap ronde. Dari sini Anda bisa menyimpan ronde sebelum ronde penerimaan ke Arsip; ronde yang diterima tetap di Bank Soal."
      />

      {galat && (
        <div role="alert" className="mb-4 text-xs leading-relaxed text-[#A4262C]">
          {galat}
        </div>
      )}

      {loading ? (
        <p className="font-mono text-xs text-[var(--ink-muted)]">Memuat riwayat...</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="Belum ada butir diterima"
          description="Butir yang lolos debat akan tercatat di sini."
        />
      ) : (
        <Table data={items} columns={columns} />
      )}
    </div>
  );
}
