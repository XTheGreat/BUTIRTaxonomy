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

export default function LaporanPage({
  params,
}: {
  params: Promise<{ ujianId: string }>;
}) {
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
        Mengompilasi laporan analisis butir empiris...
      </div>
    );
  }

  if (!laporan) {
    return (
      <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono">
        Laporan belum tersedia atau data peserta belum terkumpul.
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
        title={`Laporan Analisis: ${laporan.judul}`}
        description="Evaluasi empiris tingkat kesukaran prediksi versus aktual serta daya pembeda butir soal."
        action={
          <Link href={`/ujian/${ujianId}`}>
            <Button variant="secondary" size="sm">
              ← Kembali ke Detail Ujian
            </Button>
          </Link>
        }
      />

      {laporan.daya_beda_indikatif && (
        <div className="p-3 mb-4 border border-[#8A5A00]/30 bg-[#FBF1D9] text-xs text-[#8A5A00] leading-relaxed">
          {dayaBedaAda
            ? `Baru ${laporan.total_peserta} peserta, di bawah ${
                laporan.min_peserta_bermakna ?? 30
              } yang dibutuhkan agar daya beda bermakna. Anggap daya beda dan tingkat kesukaran aktual sebagai indikasi awal, bukan nilai final.`
            : `Baru ${laporan.total_peserta} peserta, terlalu sedikit untuk menghitung daya beda (minimal 4). Hanya tingkat kesukaran yang ditampilkan, dan itu pun indikatif.`}
        </div>
      )}

      <div className="border border-[var(--line)] bg-[var(--surface)] mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--line)]">
          <div className="p-6">
            <span className="text-xs font-medium text-[var(--ink-muted)] font-sans block mb-1.5">
              Total Peserta Ujian
            </span>
            <div className="font-serif text-4xl font-normal text-[var(--ink)] tabular-nums">
              {laporan.total_peserta}
            </div>
            <p className="text-xs text-[var(--ink-muted)] mt-1.5">
              Peserta yang telah menyelesaikan lembar ujian
            </p>
          </div>

          <div className="p-6">
            <span className="text-xs font-medium text-[var(--ink-muted)] font-sans block mb-1.5">
              Jumlah Butir Soal
            </span>
            <div className="font-serif text-4xl font-normal text-[var(--ink)] tabular-nums">
              {laporan.analisis_butir.length}
            </div>
            <p className="text-xs text-[var(--ink-muted)] mt-1.5">
              Butir naskah aktif dalam instrumen evaluasi
            </p>
          </div>

          <div className="p-6">
            <span className="text-xs font-medium text-[var(--ink-muted)] font-sans block mb-1.5">
              Butir Perlu Ditinjau
            </span>
            <div
              className={`font-serif text-4xl font-normal tabular-nums ${
                butirPerluTinjau > 0 ? "text-[#8A5A00]" : "text-[var(--ink)]"
              }`}
            >
              {butirPerluTinjau}
            </div>
            <p className="text-xs text-[var(--ink-muted)] mt-1.5">
              Butir dengan anomali selisih prediksi atau daya beda rendah
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between border-b border-[var(--line)] pb-2">
          <h2 className="font-serif text-lg font-normal text-[var(--ink)]">
            Kalibrasi Prediksi vs Aktual
          </h2>
          <span className="text-xs text-[var(--ink-muted)] font-mono">
            {laporan.analisis_butir.length} Butir Naskah
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
                  Pertanyaan Naskah
                </th>
                <th className="w-20 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                  Bloom
                </th>
                <th className="w-52 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                  Prediksi vs Aktual
                </th>
                <th className="w-28 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] font-mono">
                  Daya Beda
                </th>
                <th className="w-28 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] font-mono">
                  Rasio Benar
                </th>
                <th className="w-32 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] text-right">
                  Status
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
                      <span>Belum ada data analisis butir untuk paket ujian ini.</span>
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
                                ? "bg-[#FBEAEA] text-[#A4262C] border-[#A4262C]/30"
                                : "bg-[#E8F3EB] text-[#1F6B3A] border-[#1F6B3A]/30"
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
                              ? "text-[#1F6B3A] font-medium"
                              : item.daya_beda >= 0.2
                              ? "text-[#8A5A00] font-medium"
                              : "text-[#A4262C] font-semibold"
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
                        <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-[#FBF1D9] text-[#8A5A00] border border-[#8A5A00]/30">
                          Perlu ditinjau
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--ink-muted)] font-mono">
                          Stabil
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
            Pedoman Interpretasi Daya Beda:
          </div>
          <div className="font-mono text-[11px]">
            ≥ 0.30: Daya Beda Baik (Hijau) | 0.20–0.29: Cukup (Kuning) | &lt; 0.20: Lemah (Merah)
          </div>
        </div>
      </section>
    </div>
  );
}
