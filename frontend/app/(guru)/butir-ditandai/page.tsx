"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ButirSoal } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import BloomChip from "@/components/ui/BloomChip";
import EmptyState from "@/components/ui/EmptyState";
import RondeIndicator from "@/components/ui/RondeIndicator";
import { Lock } from "lucide-react";
import MathText from "@/components/ui/MathText";

export default function ButirDitandaiPage() {
  const [butirList, setButirList] = useState<ButirSoal[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const data = await apiFetch("/api/butir?status=ditandai");
      setButirList(Array.isArray(data) ? data : []);
    } catch {
      setButirList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleApprove(id: string) {
    try {
      await apiFetch(`/api/butir/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "diterima" }),
      });
      setButirList((prev) => prev.filter((b) => b.id !== id));
    } catch {}
  }

  async function handleReject(id: string) {
    try {
      await apiFetch(`/api/butir/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ditolak" }),
      });
      setButirList((prev) => prev.filter((b) => b.id !== id));
    } catch {}
  }

  return (
    <div>
      <PageHeader
        title="Butir Ditandai"
        description="Daftar butir soal yang tidak mencapai mufakat dalam batas ronde debat maksimal dan memerlukan telaah manual guru atau dosen."
      />

      {loading ? (
        <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono">
          Memuat daftar butir ditandai...
        </div>
      ) : butirList.length === 0 ? (
        <EmptyState
          title="Tidak ada butir yang ditandai"
          description="Seluruh butir soal telah melalui verifikasi atau diterima ke dalam Bank Soal."
          action={
            <Link href="/bank-soal">
              <Button size="sm" variant="secondary">
                Buka Bank Soal
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {butirList.map((butir, idx) => (
            <article
              key={butir.id}
              className="border border-[var(--line)] bg-[var(--canvas)] p-6"
            >
              
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--line)] text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[var(--ink-muted)]">
                    #{idx + 1}
                  </span>
                  <StatusBadge status={butir.status} />
                  <BloomChip level={butir.level_bloom} target={butir.level_target} />
                </div>
                <RondeIndicator ronde={butir.ronde_saat_ini} />
              </div>

              <div className="mb-4">
                <p className="font-serif text-base sm:text-lg text-[var(--ink)] leading-relaxed">
                  <MathText text={butir.pertanyaan} />
                </p>
              </div>

              <div className="flex flex-col gap-1.5 mb-5 border-t border-[var(--line)] pt-3">
                {Object.entries(butir.pilihan || {}).map(([key, val]) => {
                  const isKey = key === butir.kunci_jawaban;
                  return (
                    <div
                      key={key}
                      className={`flex items-start gap-3 p-2.5 rounded text-sm transition-colors ${
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
                <div className="bg-[var(--surface)] border border-[var(--line)] p-3.5 mb-5 text-xs">
                  <div className="font-sans text-xs font-medium text-[var(--ink-muted)] mb-1">
                    Pembahasan Naskah
                  </div>
                  <p className="font-serif text-[var(--ink)] leading-relaxed text-sm">
                    <MathText text={butir.pembahasan} />
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-[var(--line)]">
                <Link href={`/butir-ditandai/${butir.id}`}>
                  <Button size="sm" variant="secondary">
                    Periksa Log Debat
                  </Button>
                </Link>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleReject(butir.id)}
                  >
                    Tolak Butir
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleApprove(butir.id)}
                  >
                    Setujui Butir
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
