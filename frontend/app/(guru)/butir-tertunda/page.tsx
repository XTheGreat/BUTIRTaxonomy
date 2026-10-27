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
import { useTeks } from "@/lib/teks";

const sedangDiproses = (status: string) =>
  status === "draft" || status === "debating";

function HasilPercobaan({ hasil }: { hasil: string }) {
  const t = useTeks().telaah;
  if (hasil === "dihentikan" || hasil === "berjalan") {
    return (
      <span className="text-xs font-semibold text-[var(--ink-muted)]">
        {hasil === "dihentikan" ? t.tertunda.hasilDihentikan : t.tertunda.hasilBerjalan}
      </span>
    );
  }
  return <StatusBadge status={hasil} />;
}

function PenyebabRamah({ alasan }: { alasan: string | null }) {
  const t = useTeks().telaah;
  const p = ringkasPenyebab(alasan, t.penyebab);
  return (
    <span className="block text-xs leading-relaxed">
      <span className="block text-[var(--ink)]">{p.judul}</span>
      {p.saran && <span className="block text-[var(--ink-muted)]">{p.saran}</span>}
    </span>
  );
}

export default function ButirTertundaPage() {
  const t = useTeks().telaah;
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
      setError(err.message || t.tertunda.aksiGagal);
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
      setError(err.message || t.tertunda.ulangiSemuaGagal);
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
      header: t.tertunda.kolom.kisiKisi,
      className: "max-w-[220px]",
      render: (b) => (
        <span className="font-serif line-clamp-2" title={b.kisi_kisi_label}>
          {b.kisi_kisi_label}
        </span>
      ),
    },
    {
      key: "level_bloom",
      header: t.tertunda.kolom.bloom,
      render: (b) => <BloomChip level={b.level_bloom} />,
    },
    {
      key: "status",
      header: t.tertunda.kolom.status,
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
      header: t.tertunda.kolom.percobaan,
      className: "font-mono text-xs tabular-nums",
      render: (b) => t.tertunda.percobaanKe(b.percobaan_ke),
    },
    {
      key: "alasan_tertunda",
      header: t.tertunda.kolom.penyebab,
      className: "max-w-[280px]",
      render: (b) =>
        b.status === "tertunda" ? (
          <PenyebabRamah alasan={b.alasan_tertunda} />
        ) : (
          <span className="text-xs text-[var(--ink-muted)]">
            {b.status === "draft" ? t.tertunda.menungguGiliran : t.tertunda.sedangBerdebat}
          </span>
        ),
    },
    {
      key: "updated_at",
      header: t.tertunda.kolom.diperbarui,
      className: "text-xs text-[var(--ink-muted)] tabular-nums whitespace-nowrap",
      render: (b) => formatWaktu(b.updated_at),
    },
    {
      key: "aksi",
      header: t.tertunda.kolom.aksi,
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
                title={b.bisa_dilanjutkan ? t.tertunda.petunjukLanjutkan : undefined}
              >
                {b.bisa_dilanjutkan ? t.tertunda.lanjutkan : t.tertunda.ulangi}
              </Button>
              {b.bisa_dilanjutkan && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busyId === b.id || bulkBusy}
                  onClick={() => aksiButir(b.id, "retry", true)}
                  title={t.tertunda.petunjukDariAwal}
                >
                  {t.tertunda.dariAwal}
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
              {t.tertunda.hentikan}
            </Button>
          )}
          <Link
            href={`/debat/${b.id}`}
            className="inline-flex items-center rounded px-2 py-1 font-sans text-xs font-medium text-[var(--accent)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            {t.tertunda.debatLive}
          </Link>
          <Button size="sm" variant="ghost" aria-expanded={riwayatId === b.id} onClick={() => bukaRiwayat(b.id)}>
            {riwayatId === b.id ? t.tertunda.tutupRiwayat : t.tertunda.riwayat}
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
      header: t.tertunda.kolom.statusAkhir,
      render: (b) => <StatusBadge status={b.status} />,
    },
    {
      key: "aksi",
      header: t.tertunda.kolom.aksi,
      render: (b) => (
        <div className="flex items-center gap-1.5">
          <Link
            href={`/debat/${b.id}`}
            className="inline-flex items-center rounded px-2 py-1 font-sans text-xs font-medium text-[var(--accent)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            {t.tertunda.debatLive}
          </Link>
          <Button size="sm" variant="ghost" aria-expanded={riwayatId === b.id} onClick={() => bukaRiwayat(b.id)}>
            {riwayatId === b.id ? t.tertunda.tutupRiwayat : t.tertunda.riwayat}
          </Button>
        </div>
      ),
    },
  ];

  function renderRiwayat(_b: ButirTertunda, nomor: number) {
    return (
      <div className="px-6 py-4">
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h3 className="font-serif text-[15px] font-medium text-[var(--ink)]">{t.tertunda.riwayatPercobaan}</h3>
          <span aria-hidden="true" className="h-4 w-px bg-[var(--line-strong)]" />
          <span className="font-mono text-sm tabular-nums text-[var(--ink)]">#{nomor + 1}</span>
        </div>
        {riwayatLoading && riwayat.length === 0 ? (
          <p className="font-mono text-xs text-[var(--ink-muted)]">{t.tertunda.memuatRiwayat}</p>
        ) : riwayat.length === 0 ? (
          <p className="text-xs text-[var(--ink-muted)]">{t.tertunda.belumAdaPercobaan}</p>
        ) : (
          <table className="w-full border-collapse border border-[var(--line-strong)] bg-[var(--canvas)] text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--line-strong)] bg-[var(--surface)] text-[11px] text-[var(--ink)]">
                <th className="py-2 pr-4 pl-3 font-medium border-r border-[var(--line)]">{t.tertunda.kolom.percobaan}</th>
                <th className="py-2 px-3 font-medium border-r border-[var(--line)]">{t.tertunda.kolom.hasil}</th>
                <th className="py-2 px-3 font-medium border-r border-[var(--line)]">{t.tertunda.kolom.ronde}</th>
                <th className="py-2 px-3 font-medium border-r border-[var(--line)]">{t.tertunda.kolom.mulai}</th>
                <th className="py-2 px-3 font-medium border-r border-[var(--line)]">{t.tertunda.kolom.selesai}</th>
                <th className="py-2 px-3 font-medium">{t.tertunda.kolom.keterangan}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line-strong)]">
              {riwayat.map((r) => (
                <tr key={r.percobaan_ke} className="align-top">
                  <td className="py-2.5 pr-4 pl-3 border-r border-[var(--line)] font-mono tabular-nums whitespace-nowrap">
                    {t.tertunda.percobaanKe(r.percobaan_ke)}
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
        title={t.tertunda.judul}
        description={t.tertunda.deskripsi}
        action={
          <Button
            variant="primary"
            disabled={jumlahTertunda === 0 || bulkBusy}
            onClick={() => setConfirmBulk(true)}
          >
            {t.tertunda.ulangiSemuaButir}
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
            ["tertunda", t.tertunda.tabPerluDiulang],
            ["riwayat", t.tertunda.tabRiwayatPengulangan],
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
            {t.tertunda.memuat}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title={t.tertunda.kosongJudul}
            description={t.tertunda.kosongDeskripsi}
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
          {t.tertunda.memuatRiwayatPengulangan}
        </div>
      ) : (
        <Table
          data={diulang}
          columns={diulangColumns}
          expandedKey={riwayatId}
          renderExpanded={renderRiwayat}
          emptyMessage={t.tertunda.belumAdaDiulang}
        />
      )}

      <ConfirmDialog
        open={confirmBulk}
        title={t.tertunda.konfirmasiJudul}
        description={t.tertunda.konfirmasiDeskripsi(jumlahTertunda)}
        confirmLabel={t.tertunda.ulangiSemua}
        loading={bulkBusy}
        onConfirm={ulangiSemua}
        onCancel={() => setConfirmBulk(false)}
      />
    </div>
  );
}
