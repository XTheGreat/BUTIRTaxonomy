"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ButirSoal, DebatLog } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import BloomChip from "@/components/ui/BloomChip";
import PipMeter from "@/components/ui/PipMeter";
import RondeIndicator from "@/components/ui/RondeIndicator";
import { Lock, PackageOpen } from "lucide-react";
import MathText from "@/components/ui/MathText";
import EditButirDialog from "@/components/ui/EditButirDialog";
import { useTeks } from "@/lib/teks";

export default function DebatLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const butirId = resolvedParams.id;
  const router = useRouter();
  const t = useTeks().telaah;
  const agenLabels: Record<string, { role: string; model: string }> = {
    penyusun: { role: t.detailDitandai.agen.penyusun, model: t.detailDitandai.penyediaSekunder },
    kritikus: { role: t.detailDitandai.agen.kritikus, model: t.detailDitandai.penyediaPrimer },
    penjawab_buta: { role: t.detailDitandai.agen.penjawabButa, model: t.detailDitandai.penyediaPrimer },
    arbiter: { role: t.detailDitandai.agen.arbiter, model: t.detailDitandai.penyediaSekunder },
  };

  const [butir, setButir] = useState<ButirSoal | null>(null);
  const [logs, setLogs] = useState<DebatLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    async function loadAll() {
      try {
        const [allButir, debatLogs] = await Promise.all([
          apiFetch("/api/butir").catch(() => []),
          apiFetch(`/api/butir/${butirId}/debat-log`).catch(() => []),
        ]);

        if (Array.isArray(allButir)) {
          const found = allButir.find((b: ButirSoal) => b.id === butirId);
          if (found) setButir(found);
        }

        if (Array.isArray(debatLogs)) {
          setLogs(debatLogs);
        }
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [butirId]);

  async function handleApprove() {
    setActionLoading(true);
    try {
      await apiFetch(`/api/butir/${butirId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "diterima" }),
      });
      router.push("/butir-ditandai");
    } catch {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    setActionLoading(true);
    try {
      await apiFetch(`/api/butir/${butirId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ditolak" }),
      });
      router.push("/butir-ditandai");
    } catch {
      setActionLoading(false);
    }
  }

  const rondeMap: Record<number, DebatLog[]> = {};
  logs.forEach((log) => {
    if (!rondeMap[log.ronde]) rondeMap[log.ronde] = [];
    rondeMap[log.ronde].push(log);
  });

  return (
    <div>
      <PageHeader
        title={t.detailDitandai.judul}
        description={t.detailDitandai.deskripsi}
        breadcrumb={[
          { label: t.ditandai.judul, href: "/butir-ditandai" },
          { label: t.detailDitandai.butirNomor(butirId.slice(0, 6)) },
        ]}
      />

      <div className="w-full">
        {loading ? (
        <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono">
          {t.detailDitandai.memuat}
        </div>
      ) : (
        <div className="space-y-8">
          
          {butir && (
            <section className="border border-[var(--line)] bg-[var(--canvas)] p-6">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--line)] text-xs">
                <div className="flex items-center gap-2">
                  <StatusBadge status={butir.status} />
                  <BloomChip level={butir.level_bloom} target={butir.level_target} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--ink-muted)]">{t.umum.rondeLabel}</span>
                  <RondeIndicator ronde={butir.ronde_saat_ini} />
                </div>
              </div>

              <div className="mb-4">
                <p className="font-serif text-base sm:text-lg text-[var(--ink)] leading-relaxed">
                  <MathText text={butir.pertanyaan} />
                </p>
              </div>

              <div className="flex flex-col gap-1.5 mb-4 border-t border-[var(--line)] pt-3">
                {Object.entries(butir.pilihan || {}).map(([key, val]) => {
                  const isKey = key === butir.kunci_jawaban;
                  return (
                    <div
                      key={key}
                      className={`flex items-start gap-3 p-2.5 rounded text-sm ${
                        isKey
                          ? "border border-transparent text-[var(--status-diterima)] font-medium"
                          : "border border-transparent text-[var(--ink)]"
                      }`}
                    >
                      <span className="font-mono text-xs font-semibold w-5 shrink-0 pt-0.5">
                        {key}.
                      </span>
                      <span className="font-serif flex-1 leading-normal">
                        <MathText text={val} />
                      </span>
                      {isKey && (
                        <span
                          className="inline-flex items-center text-[var(--status-diterima)] shrink-0 pt-0.5"
                          title={t.umum.kunciJawaban}
                        >
                          <Lock size={14} strokeWidth={2} aria-label={t.umum.kunciJawaban} />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {butir.pembahasan && (
                <div className="bg-[var(--surface)] border border-[var(--line)] p-3 text-xs">
                  <div className="font-sans text-xs font-medium text-[var(--ink-muted)] mb-1">
                    {t.detailDitandai.pembahasanKunci}
                  </div>
                  <p className="font-serif text-[var(--ink)] leading-relaxed">
                    <MathText text={butir.pembahasan} />
                  </p>
                </div>
              )}
            </section>
          )}

          <section className="space-y-6">
            <h2 className="font-serif text-lg font-normal text-[var(--ink)] border-b border-[var(--line)] pb-2">
              {t.detailDitandai.timeline}
            </h2>

            {Object.keys(rondeMap).length === 0 ? (
              <div className="border border-dashed border-[var(--line-strong)]/40 bg-[var(--surface)]/40 p-8 text-center text-xs text-[var(--ink-muted)] rounded-lg flex flex-col items-center justify-center gap-2 select-none">
                <PackageOpen
                  size={40}
                  strokeWidth={1.25}
                  className="text-[var(--ink-muted)]/65"
                />
                <span>{t.detailDitandai.belumAdaLog}</span>
              </div>
            ) : (
              <div>
                {Object.entries(rondeMap).map(([ronde, entries]) => (
                  <div
                    key={ronde}
                    className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-4"
                  >
                    <div className="flex flex-col items-center" aria-hidden="true">
                      <span className="h-5 flex items-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
                      </span>
                      <span className="flex-1 w-[2px] bg-[var(--line-strong)]" />
                    </div>

                    <div className="min-w-0 pb-6 last:pb-0">
                      <div className="h-5 flex items-center font-mono text-xs font-semibold text-[var(--ink)]">
                        {t.umum.ronde(ronde)}
                      </div>

                      <div className="mt-3 space-y-5">
                        {entries.map((log) => {
                          const agentMeta = agenLabels[log.agen] || {
                            role: log.agen.toUpperCase(),
                            model: t.detailDitandai.agenAi,
                          };
                          const output = log.output_json || {};

                          return (
                            <div
                              key={log.id}
                              className="border border-[var(--line)] bg-[var(--canvas)] p-4 rounded-none"
                            >
                        
                              <div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--line)]">
                                <span className="font-mono text-xs font-semibold tracking-wider text-[var(--ink)]">
                                  {agentMeta.role}
                                </span>
                                <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                                  {agentMeta.model}
                                </span>
                              </div>

                              {log.agen === "kritikus" && (
                                <div className="space-y-3">
                                  {output.skor_rubrik && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[var(--surface)] p-3 border border-[var(--line)]">
                                      {Object.entries(output.skor_rubrik).map(
                                        ([kriteria, skor]) => (
                                          <PipMeter
                                            key={kriteria}
                                            label={
                                              t.rubrik[kriteria] ??
                                              kriteria.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                                            }
                                            score={typeof skor === "number" ? skor : 3}
                                            maxScore={5}
                                          />
                                        )
                                      )}
                                    </div>
                                  )}

                                  {(output.catatan_kritik || output.catatan_kritis) && (
                                    <div className="text-xs text-[var(--ink)] leading-relaxed">
                                      <span className="font-sans text-xs text-[var(--ink-muted)] block mb-0.5">
                                        {t.detailDitandai.catatanKritik}
                                      </span>
                                      <p className="font-serif bg-[var(--surface)] p-2.5 border border-[var(--line)]">
                                        {output.catatan_kritik || output.catatan_kritis}
                                      </p>
                                    </div>
                                  )}

                                  {(output.usulan_perbaikan || output.rekomendasi_revisi) && (
                                    <div className="text-xs text-[var(--ink)] leading-relaxed">
                                      <span className="font-sans text-xs text-[var(--ink-muted)] block mb-0.5">
                                        {t.detailDitandai.arahanRevisi}
                                      </span>
                                      <p className="font-serif">
                                        {output.usulan_perbaikan || output.rekomendasi_revisi}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {log.agen === "arbiter" && (
                                <div className="border border-[var(--ink)] p-3.5 bg-[var(--surface)]">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-mono text-xs font-semibold text-[var(--ink)]">
                                      {t.detailDitandai.putusanArbiter}
                                    </span>
                                    <StatusBadge
                                      status={
                                        output.status || output.verdict || "ditandai"
                                      }
                                    />
                                  </div>
                                  <p className="font-serif text-sm text-[var(--ink)] leading-relaxed">
                                    {output.alasan_putusan ||
                                      output.alasan ||
                                      output.catatan ||
                                      t.detailDitandai.tanpaUraianPutusan}
                                  </p>
                                </div>
                              )}

                              {log.agen === "penjawab_buta" && (
                                <div className="text-xs space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[var(--ink-muted)]">
                                      {t.detailDitandai.jawabanDipilih}
                                    </span>
                                    <span className="font-mono font-bold text-sm text-[var(--ink)] px-2 py-0.5 border border-[var(--line)] bg-[var(--surface)]">
                                      {output.jawaban_pilihan ||
                                        output.jawaban_terpilih ||
                                        output.jawaban ||
                                        "-"}
                                    </span>
                                    {output.tingkat_keyakinan != null && (
                                      <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                                        {t.detailDitandai.keyakinan(output.tingkat_keyakinan)}
                                      </span>
                                    )}
                                  </div>
                                  {(output.alasan_singkat || output.alasan) && (
                                    <p className="font-serif text-[var(--ink)] text-xs leading-relaxed bg-[var(--surface)] p-2 border border-[var(--line)]">
                                      {output.alasan_singkat || output.alasan}
                                    </p>
                                  )}
                                </div>
                              )}

                              {log.agen === "penyusun" && (
                                <div className="text-xs text-[var(--ink-muted)] font-serif leading-relaxed">
                                  <p className="line-clamp-2">
                                    <MathText text={output.pertanyaan || t.detailDitandai.naskahDraf} />
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <div className="sticky bottom-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 -mb-4 sm:-mb-6 lg:-mb-8 mt-6 bg-[var(--canvas)] border-t border-[var(--line)] py-3 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Link href="/butir-ditandai">
            <Button variant="secondary" size="sm">
              {t.detailDitandai.kembaliKeDaftar}
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              variant="danger"
              size="sm"
              disabled={actionLoading}
              onClick={handleReject}
            >
              {t.umum.tolakButir}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={actionLoading || !butir}
              onClick={() => setEditing(true)}
            >
              {t.detailDitandai.revisiDanTerima}
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={actionLoading}
              onClick={handleApprove}
            >
              {actionLoading ? t.umum.memproses : t.detailDitandai.setujuiDanSimpan}
            </Button>
          </div>
        </div>
      </div>
      </div>

      <EditButirDialog
        butir={editing ? butir : null}
        mode="terima"
        onClose={() => setEditing(false)}
        onSaved={() => router.push("/butir-ditandai")}
      />
    </div>
  );
}
