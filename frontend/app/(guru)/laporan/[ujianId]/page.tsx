"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Laporan } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import BloomChip from "@/components/ui/BloomChip";
import { PackageOpen } from "lucide-react";
import MathText from "@/components/ui/MathText";
import { useTeks } from "@/lib/teks";

export default function LaporanPage({
  params,
}: {
  params: Promise<{ ujianId: string }>;
}) {
  const t = useTeks().ujian;
  const resolvedParams = use(params);
  const ujianId = resolvedParams.ujianId;

  const [laporan, setLaporan] = useState<Laporan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/ujian/${ujianId}/laporan`)
      .then((data) => {
        setLaporan(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ujianId]);

  if (loading) {
    return (
      <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono">
        {t.laporan.memuat}
      </div>
    );
  }

  if (!laporan) {
    return (
      <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono">
        {t.laporan.belumTersedia}
      </div>
    );
  }

  const dayaBedaAda = laporan.daya_beda_dihitung !== false;

  const butirPerluTinjau = laporan.analisis_butir.filter((item) => {
    const selisih =
      item.prediksi_kesukaran !== null
        ? Math.abs(item.prediksi_kesukaran - item.tingkat_kesukaran_aktual)
        : 0;
    return selisih >= 0.25 || (dayaBedaAda && item.daya_beda < 0.2);
  }).length;

  return (
    <div>
      <PageHeader
        title={t.laporan.judul(laporan.judul)}
        description={t.laporan.deskripsi}
        action={
          <Link href={`/ujian/${ujianId}`}>
            <Button variant="secondary" size="sm">
              {t.laporan.kembali}
            </Button>
          </Link>
        }
      />

      {laporan.daya_beda_indikatif && (
        <div className="p-3 mb-4 border border-[var(--status-ditandai)]/30 bg-[var(--status-ditandai-bg)] text-xs text-[var(--status-ditandai)] leading-relaxed">
          {dayaBedaAda
            ? t.laporan.peringatanIndikatif(laporan.total_peserta, laporan.min_peserta_bermakna ?? 30)
            : t.laporan.peringatanSangatSedikit(laporan.total_peserta)}
        </div>
      )}

      <div className="border border-[var(--line)] bg-[var(--surface)] mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--line)]">
          <div className="p-6">
            <span className="text-xs font-medium text-[var(--ink-muted)] font-sans block mb-1.5">
              {t.laporan.ringkasan.totalPeserta}
            </span>
            <div className="font-serif text-4xl font-normal text-[var(--ink)] tabular-nums">
              {laporan.total_peserta}
            </div>
            <p className="text-xs text-[var(--ink-muted)] mt-1.5">
              {t.laporan.ringkasan.totalPesertaKet}
            </p>
          </div>

          <div className="p-6">
            <span className="text-xs font-medium text-[var(--ink-muted)] font-sans block mb-1.5">
              {t.laporan.ringkasan.jumlahButir}
            </span>
            <div className="font-serif text-4xl font-normal text-[var(--ink)] tabular-nums">
              {laporan.analisis_butir.length}
            </div>
            <p className="text-xs text-[var(--ink-muted)] mt-1.5">
              {t.laporan.ringkasan.jumlahButirKet}
            </p>
          </div>

          <div className="p-6">
            <span className="text-xs font-medium text-[var(--ink-muted)] font-sans block mb-1.5">
              {t.laporan.ringkasan.perluDitinjau}
            </span>
            <div
              className={`font-serif text-4xl font-normal tabular-nums ${
                butirPerluTinjau > 0 ? "text-[var(--status-ditandai)]" : "text-[var(--ink)]"
              }`}
            >
              {butirPerluTinjau}
            </div>
            <p className="text-xs text-[var(--ink-muted)] mt-1.5">
              {t.laporan.ringkasan.perluDitinjauKet}
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between border-b border-[var(--line)] pb-2">
          <h2 className="font-serif text-lg font-normal text-[var(--ink)]">
            {t.laporan.kalibrasi}
          </h2>
          <span className="text-xs text-[var(--ink-muted)] font-mono">
            {t.laporan.butirNaskah(laporan.analisis_butir.length)}
          </span>
        </div>

        <div className="border border-[var(--line)] bg-[var(--canvas)] overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-[var(--surface)] border-b border-[var(--line)]">
              <tr>
                <th className="w-12 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] font-mono">
                  #
                </th>
                <th className="px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                  {t.laporan.kolom.pertanyaan}
                </th>
                <th className="w-20 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                  {t.laporan.kolom.bloom}
                </th>
                <th className="w-52 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                  {t.laporan.kolom.prediksiAktual}
                </th>
                <th className="w-28 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] font-mono">
                  {t.laporan.kolom.dayaBeda}
                </th>
                <th className="w-28 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] font-mono">
                  {t.laporan.kolom.rasioBenar}
                </th>
                <th className="w-32 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] text-right">
                  {t.laporan.kolom.status}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {laporan.analisis_butir.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-xs text-[var(--ink-muted)] font-normal"
                  >
                    <div className="flex flex-col items-center justify-center gap-2 select-none py-2">
                      <PackageOpen
                        size={40}
                        strokeWidth={1.25}
                        className="text-[var(--ink-muted)]/65"
                      />
                      <span>{t.laporan.kosong}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                laporan.analisis_butir.map((item, i) => {
                  const predPct =
                    item.prediksi_kesukaran !== null
                      ? Math.round(item.prediksi_kesukaran * 100)
                      : null;
                  const aktPct = Math.round(item.tingkat_kesukaran_aktual * 100);
                  const delta = predPct !== null ? aktPct - predPct : null;
                  const isDiscrepant =
                    (delta !== null && Math.abs(delta) >= 25) ||
                    (dayaBedaAda && item.daya_beda < 0.2);

                  return (
                    <tr
                      key={item.butir_id}
                    className="hover:bg-[var(--surface)]/60 transition-colors duration-140"
                  >
                    <td className="px-3 py-2.5 font-mono text-xs text-[var(--ink-muted)] tabular-nums">
                      {i + 1}
                    </td>
                    <td className="px-3 py-2.5 max-w-sm">
                      <p className="font-serif text-sm text-[var(--ink)] line-clamp-2 leading-relaxed">
                        <MathText text={item.pertanyaan} />
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <BloomChip level={item.level_bloom} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
                        <span className="text-[var(--ink-muted)]">
                          {predPct !== null ? `${predPct}%` : "-"}
                        </span>
                        <span className="text-[var(--line-strong)]">→</span>
                        <span className="font-medium text-[var(--ink)]">
                          {aktPct}%
                        </span>

                        {delta !== null && Math.abs(delta) > 0 && (
                          <span
                            className={`inline-block px-1 py-0.2 rounded text-[10px] font-mono tabular-nums border ${
                              delta > 0
                                ? "bg-[var(--status-ditolak-bg)] text-[var(--status-ditolak)] border-[var(--status-ditolak)]/30"
                                : "bg-[var(--status-diterima-bg)] text-[var(--status-diterima)] border-[var(--status-diterima)]/30"
                            }`}
                          >
                            {delta > 0 ? `+${delta}%` : `${delta}%`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs tabular-nums">
                      {dayaBedaAda ? (
                        <span
                          className={
                            item.daya_beda >= 0.3
                              ? "text-[var(--status-diterima)] font-medium"
                              : item.daya_beda >= 0.2
                              ? "text-[var(--status-ditandai)] font-medium"
                              : "text-[var(--status-ditolak)] font-semibold"
                          }
                        >
                          {item.daya_beda.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[var(--ink-muted)]">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-[var(--ink-muted)] tabular-nums">
                      {item.total_benar}/{item.total_jawab}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {isDiscrepant ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-[var(--status-ditandai-bg)] text-[var(--status-ditandai)] border border-[var(--status-ditandai)]/30">
                          {t.laporan.perluDitinjauBadge}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--ink-muted)] font-mono">
                          {t.laporan.stabil}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

        <div className="border border-[var(--line)] bg-[var(--surface)] p-4 text-xs text-[var(--ink-muted)] max-w-lg space-y-1">
          <div className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink)] font-semibold">
            {t.laporan.pedomanJudul}
          </div>
          <div className="font-mono text-[11px]">
            {t.laporan.pedoman}
          </div>
        </div>
      </section>
    </div>
  );
}
