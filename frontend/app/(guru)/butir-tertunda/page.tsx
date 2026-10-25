"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ButirTertunda, RiwayatPercobaan } from "@/lib/types";
import { formatWaktu } from "@/lib/format";
import { ringkasPenyebab } from "@/lib/penyebabTertunda";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Table, { Column } from "@/components/ui/Table";
import StatusBadge from "@/components/ui/StatusBadge";
import BloomChip from "@/components/ui/BloomChip";
import RondeIndicator from "@/components/ui/RondeIndicator";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const sedangDiproses = (status: string) =>
  status === "draft" || status === "debating";

function HasilPercobaan({ hasil }: { hasil: string }) {
  if (hasil === "dihentikan" || hasil === "berjalan") {
    return (
      <span className="text-xs font-semibold text-[var(--ink-muted)]">
        {hasil === "dihentikan" ? "Dihentikan" : "Berjalan"}
      </span>
    );
  }
  return <StatusBadge status={hasil} />;
}

function PenyebabRamah({ alasan }: { alasan: string | null }) {
  const p = ringkasPenyebab(alasan);
  return (
    <span className="block text-xs leading-relaxed">
      <span className="block text-[var(--ink)]">{p.judul}</span>
      {p.saran && <span className="block text-[var(--ink-muted)]">{p.saran}</span>}
    </span>
  );
}

export default function ButirTertundaPage() {
  const [tab, setTab] = useState<"tertunda" | "riwayat">("tertunda");
  const [items, setItems] = useState<ButirTertunda[]>([]);
  const [diulang, setDiulang] = useState<ButirTertunda[]>([]);
  const [diulangLoading, setDiulangLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [riwayatId, setRiwayatId] = useState<string | null>(null);
  const [riwayat, setRiwayat] = useState<RiwayatPercobaan[]>([]);
  const [riwayatLoading, setRiwayatLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await apiFetch("/api/butir/tertunda");
      setItems(Array.isArray(data) ? data : []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDiulang = useCallback(async () => {
    setDiulangLoading(true);
    try {
      const data = await apiFetch("/api/butir/diulang");
      setDiulang(Array.isArray(data) ? data : []);
    } catch {
      setDiulang([]);
    } finally {
      setDiulangLoading(false);
    }
  }, []);

  const loadRiwayat = useCallback(async (id: string) => {
    setRiwayatLoading(true);
    try {
      const data = await apiFetch(`/api/butir/${id}/riwayat`);
      setRiwayat(Array.isArray(data) ? data : []);
    } catch {
      setRiwayat([]);
    } finally {
      setRiwayatLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (tab === "riwayat") loadDiulang();
  }, [tab, loadDiulang]);

  const adaYangDiproses = items.some((b) => sedangDiproses(b.status));

  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
      if (riwayatId) loadRiwayat(riwayatId);
    }, adaYangDiproses ? 3000 : 6000);
    return () => clearInterval(interval);
  }, [adaYangDiproses, loadData, loadRiwayat, riwayatId]);

  async function aksiButir(id: string, aksi: "retry" | "stop", mulaiUlang = false) {
    setBusyId(id);
    setError("");
    try {
      await apiFetch(`/api/butir/${id}/${aksi}${mulaiUlang ? "?mulai_ulang=true" : ""}`, { method: "POST" });
      await loadData();
    } catch (err: any) {
      setError(err.message || "Aksi gagal dijalankan.");
    } finally {
      setBusyId(null);
    }
  }

  async function ulangiSemua() {
    setBulkBusy(true);
    setError("");
    try {
      await apiFetch("/api/butir/retry-semua", { method: "POST" });
      setConfirmBulk(false);
      await loadData();
    } catch (err: any) {
      setConfirmBulk(false);
      setError(err.message || "Gagal mengulang butir tertunda.");
    } finally {
      setBulkBusy(false);
    }
  }

  function bukaRiwayat(id: string) {
    if (riwayatId === id) {
      setRiwayatId(null);
      return;
    }
    setRiwayatId(id);
    setRiwayat([]);
    loadRiwayat(id);
  }

  const jumlahTertunda = items.filter((b) => b.status === "tertunda").length;

  const columns: Column<ButirTertunda>[] = [
    {
      key: "no",
      header: "#",
      className: "font-mono text-xs text-[var(--ink-muted)] tabular-nums",
      render: (_b, i) => i + 1,
    },
    {
      key: "kisi_kisi_label",
      header: "Kisi-kisi",
      className: "max-w-[220px]",
      render: (b) => (
        <span className="font-serif line-clamp-2" title={b.kisi_kisi_label}>
          {b.kisi_kisi_label}
        </span>
      ),
    },
    {
      key: "level_bloom",
      header: "Bloom",
      render: (b) => <BloomChip level={b.level_bloom} />,
    },
    {
      key: "status",
      header: "Status",
      render: (b) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={b.status} />
          {sedangDiproses(b.status) && (
            <RondeIndicator ronde={b.ronde_saat_ini} />
          )}
        </div>
      ),
    },
    {
      key: "percobaan_ke",
      header: "Percobaan",
      className: "font-mono text-xs tabular-nums",
      render: (b) => `ke-${b.percobaan_ke}`,
    },
    {
      key: "alasan_tertunda",
      header: "Penyebab",
      className: "max-w-[280px]",
      render: (b) =>
        b.status === "tertunda" ? (
          <PenyebabRamah alasan={b.alasan_tertunda} />
        ) : (
          <span className="text-xs text-[var(--ink-muted)]">
            {b.status === "draft" ? "Menunggu giliran" : "Sedang berdebat"}
          </span>
        ),
    },
    {
      key: "updated_at",
      header: "Diperbarui",
      className: "text-xs text-[var(--ink-muted)] tabular-nums whitespace-nowrap",
      render: (b) => formatWaktu(b.updated_at),
    },
    {
      key: "aksi",
      header: "Aksi",
      className: "whitespace-nowrap",
      render: (b) => (
        <div className="flex items-center gap-1.5">
          {b.status === "tertunda" ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                disabled={busyId === b.id || bulkBusy}
                onClick={() => aksiButir(b.id, "retry")}
                title={b.bisa_dilanjutkan ? "Melanjutkan dari langkah terakhir yang selesai, tanpa mengulang ronde sebelumnya" : undefined}
              >
                {b.bisa_dilanjutkan ? "Lanjutkan" : "Ulangi"}
              </Button>
              {b.bisa_dilanjutkan && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busyId === b.id || bulkBusy}
                  onClick={() => aksiButir(b.id, "retry", true)}
                  title="Mengulang debat dari ronde 1"
                >
                  Dari awal
                </Button>
              )}
            </>
          ) : (
            <Button
              size="sm"
              variant="danger"
              disabled={busyId === b.id}
              onClick={() => aksiButir(b.id, "stop")}
            >
              Hentikan
            </Button>
          )}
          <Link
            href={`/debat/${b.id}`}
            className="inline-flex items-center rounded px-2 py-1 font-sans text-xs font-medium text-[var(--accent)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Debat live
          </Link>
          <Button size="sm" variant="ghost" aria-expanded={riwayatId === b.id} onClick={() => bukaRiwayat(b.id)}>
            {riwayatId === b.id ? "Tutup Riwayat" : "Riwayat"}
          </Button>
        </div>
      ),
    },
  ];

  const diulangColumns: Column<ButirTertunda>[] = [
    ...columns.filter((c) =>
      ["no", "kisi_kisi_label", "level_bloom", "percobaan_ke", "updated_at"].includes(c.key)
    ),
    {
      key: "status",
      header: "Status Akhir",
      render: (b) => <StatusBadge status={b.status} />,
    },
    {
      key: "aksi",
      header: "Aksi",
      render: (b) => (
        <div className="flex items-center gap-1.5">
          <Link
            href={`/debat/${b.id}`}
            className="inline-flex items-center rounded px-2 py-1 font-sans text-xs font-medium text-[var(--accent)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            Debat live
          </Link>
          <Button size="sm" variant="ghost" aria-expanded={riwayatId === b.id} onClick={() => bukaRiwayat(b.id)}>
            {riwayatId === b.id ? "Tutup Riwayat" : "Riwayat"}
          </Button>
        </div>
      ),
    },
  ];

  function renderRiwayat(_b: ButirTertunda, nomor: number) {
    return (
      <div className="px-6 py-4">
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h3 className="font-serif text-[15px] font-medium text-[var(--ink)]">Riwayat Percobaan</h3>
          <span aria-hidden="true" className="h-4 w-px bg-[var(--line-strong)]" />
          <span className="font-mono text-sm tabular-nums text-[var(--ink)]">#{nomor + 1}</span>
        </div>
        {riwayatLoading && riwayat.length === 0 ? (
          <p className="font-mono text-xs text-[var(--ink-muted)]">Memuat riwayat...</p>
        ) : riwayat.length === 0 ? (
          <p className="text-xs text-[var(--ink-muted)]">Belum ada percobaan tercatat untuk butir ini.</p>
        ) : (
          <table className="w-full border-collapse border border-[var(--line-strong)] bg-[var(--canvas)] text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--line-strong)] bg-[var(--surface)] text-[11px] text-[var(--ink)]">
                <th className="py-2 pr-4 pl-3 font-medium border-r border-[var(--line)]">Percobaan</th>
                <th className="py-2 px-3 font-medium border-r border-[var(--line)]">Hasil</th>
                <th className="py-2 px-3 font-medium border-r border-[var(--line)]">Ronde</th>
                <th className="py-2 px-3 font-medium border-r border-[var(--line)]">Mulai</th>
                <th className="py-2 px-3 font-medium border-r border-[var(--line)]">Selesai</th>
                <th className="py-2 px-3 font-medium">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line-strong)]">
              {riwayat.map((r) => (
                <tr key={r.percobaan_ke} className="align-top">
                  <td className="py-2.5 pr-4 pl-3 border-r border-[var(--line)] font-mono tabular-nums whitespace-nowrap">
                    ke-{r.percobaan_ke}
                  </td>
                  <td className="py-2.5 px-3 border-r border-[var(--line)] whitespace-nowrap">
                    <HasilPercobaan hasil={r.hasil} />
                  </td>
                  <td className="py-2.5 px-3 border-r border-[var(--line)] font-mono tabular-nums whitespace-nowrap">
                    {r.ronde_terakhir || "-"}
                  </td>
                  <td className="py-2.5 px-3 border-r border-[var(--line)] tabular-nums whitespace-nowrap text-[var(--ink-muted)]">
                    {formatWaktu(r.mulai)}
                  </td>
                  <td className="py-2.5 px-3 border-r border-[var(--line)] tabular-nums whitespace-nowrap text-[var(--ink-muted)]">
                    {r.selesai ? formatWaktu(r.selesai) : "-"}
                  </td>
                  <td className="py-2.5 px-3 leading-relaxed break-words">
                    {r.alasan ? <PenyebabRamah alasan={r.alasan} /> : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Butir Tertunda"
        description="Butir yang gagal diproses karena kendala panggilan agen atau dihentikan. Ulangi satu per satu atau sekaligus; pembuatan soal baru tetap didahulukan dalam antrean."
        action={
          <Button
            variant="primary"
            disabled={jumlahTertunda === 0 || bulkBusy}
            onClick={() => setConfirmBulk(true)}
          >
            Ulangi Semua Butir Tertunda
          </Button>
        }
      />

      {error && (
        <div
          role="alert"
          className="mb-4 text-sm text-[#A4262C]"
        >
          {error}
        </div>
      )}

      <div role="tablist" className="flex gap-6 border-b border-[var(--line)] mb-4">
        {(
          [
            ["tertunda", "Perlu Diulang"],
            ["riwayat", "Riwayat Pengulangan"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              setRiwayatId(null);
            }}
            className={`pb-2 -mb-px text-[15px] font-serif border-b-2 transition-colors ${
              tab === key
                ? "border-[var(--accent)] text-[var(--ink)] font-medium"
                : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "tertunda" ? (
        loading ? (
          <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono">
            Memuat daftar butir tertunda...
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Tidak ada butir tertunda"
            description="Seluruh butir yang dibuat telah selesai ditelaah oleh agen."
          />
        ) : (
          <Table
            data={items}
            columns={columns}
            expandedKey={riwayatId}
            renderExpanded={renderRiwayat}
          />
        )
      ) : diulangLoading && diulang.length === 0 ? (
        <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono">
          Memuat riwayat pengulangan...
        </div>
      ) : (
        <Table
          data={diulang}
          columns={diulangColumns}
          expandedKey={riwayatId}
          renderExpanded={renderRiwayat}
          emptyMessage="Belum ada butir yang pernah diulang."
        />
      )}

      <ConfirmDialog
        open={confirmBulk}
        title="Ulangi semua butir tertunda?"
        description={`${jumlahTertunda} butir akan masuk antrean dan diproses satu per satu. Setiap butir memakai kuota API agen.`}
        confirmLabel="Ulangi Semua"
        loading={bulkBusy}
        onConfirm={ulangiSemua}
        onCancel={() => setConfirmBulk(false)}
      />
    </div>
  );
}
