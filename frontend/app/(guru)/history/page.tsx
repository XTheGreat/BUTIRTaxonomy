"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatWaktu } from "@/lib/format";
import { HistoryDebatTerakhir } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import BloomChip from "@/components/ui/BloomChip";
import RondeIndicator from "@/components/ui/RondeIndicator";
import EmptyState from "@/components/ui/EmptyState";
import MathText from "@/components/ui/MathText";
import { RingkasanStatus } from "@/components/ui/HistoryParts";

export default function HistoryPage() {
  const [data, setData] = useState<HistoryDebatTerakhir | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/butir/history-terakhir?lengkap=true")
      .then((hasil) => setData(hasil || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="History Debat"
        description="Seluruh butir dari generasi terakhir yang telah selesai diproses. Halaman ini hanya untuk dibaca; saat generasi baru selesai, isinya digantikan oleh generasi tersebut."
      />

      {loading ? (
        <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono">
          Memuat history debat...
        </div>
      ) : !data ? (
        <EmptyState
          title="Belum ada history debat"
          description="Setelah sebuah generasi butir selesai diproses, ringkasan dan seluruh soalnya akan tampil di sini."
        />
      ) : (
        <div className="space-y-6">
          <section className="border border-[var(--line)] bg-[var(--surface)] p-5 rounded-md space-y-4">
            <div>
              <h2 className="font-serif text-lg font-normal text-[var(--ink)] leading-snug">
                {data.label}
              </h2>
              <p className="mt-1 font-mono text-xs text-[var(--ink-muted)] tabular-nums">
                {formatWaktu(data.mulai)} – {formatWaktu(data.selesai)} · {data.total} butir
              </p>
            </div>
            <RingkasanStatus hitung={data.hitung} total={data.total} ukuranTeks="text-xs" />
          </section>

          <div className="flex flex-col gap-6">
            {data.items.map((butir, idx) => (
              <article
                key={butir.id}
                className="border border-[var(--line)] bg-[var(--canvas)] p-6"
              >
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--line)] text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[var(--ink-muted)] tabular-nums">
                      #{idx + 1}
                    </span>
                    <StatusBadge status={butir.status} />
                    <BloomChip level={butir.level_bloom} />
                    {butir.percobaan_ke > 1 && (
                      <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                        percobaan ke-{butir.percobaan_ke}
                      </span>
                    )}
                  </div>
                  <RondeIndicator ronde={butir.ronde_saat_ini} />
                </div>

                {butir.pertanyaan ? (
                  <>
                    <p className="font-serif text-base sm:text-lg text-[var(--ink)] leading-relaxed mb-4">
                      <MathText text={butir.pertanyaan} />
                    </p>

                    <div className="flex flex-col gap-1.5 border-t border-[var(--line)] pt-3">
                      {Object.entries(butir.pilihan || {}).map(([key, val]) => {
                        const isKey = key === butir.kunci_jawaban;
                        return (
                          <div
                            key={key}
                            className={`flex items-start gap-3 p-2.5 rounded text-sm ${
                              isKey
                                ? "border border-transparent text-[#1F6B3A] font-medium"
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
                                className="inline-flex items-center text-[#1F6B3A] shrink-0 pt-0.5"
                                title="Kunci jawaban"
                              >
                                <Lock size={14} strokeWidth={2} aria-label="Kunci jawaban" />
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {butir.pembahasan && (
                      <div className="mt-4 bg-[var(--surface)] border border-[var(--line)] p-3 text-xs">
                        <div className="font-sans text-xs font-medium text-[var(--ink-muted)] mb-1">
                          Pembahasan
                        </div>
                        <p className="font-serif text-[var(--ink)] leading-relaxed">
                          <MathText text={butir.pembahasan} />
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="font-serif text-sm italic text-[var(--ink-muted)]">
                    Naskah butir ini belum tersusun karena proses debat tertunda.
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
