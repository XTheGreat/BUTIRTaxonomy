"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, unduhBerkas } from "@/lib/api";
import { ButirSoal } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import BloomChip from "@/components/ui/BloomChip";
import EmptyState from "@/components/ui/EmptyState";
import { Lock } from "lucide-react";
import MathText from "@/components/ui/MathText";
import EditButirDialog from "@/components/ui/EditButirDialog";
import KelompokLipat, { useBukaTutup } from "@/components/ui/KelompokLipat";
import { KelompokBank, kelompokkan } from "@/lib/kelompokBank";
import { useTeks } from "@/lib/teks";

export default function BankSoalPage() {
  const t = useTeks().telaah;
  const [butirList, setButirList] = useState<ButirSoal[]>([]);
  const [kelompokList, setKelompokList] = useState<KelompokBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ButirSoal | null>(null);
  const [pesanHapus, setPesanHapus] = useState("");
  const [denganKunci, setDenganKunci] = useState(true);
  const [mengekspor, setMengekspor] = useState<"pdf" | "docx" | "json" | null>(null);

  async function loadBank() {
    try {
      const [data, kelompok] = await Promise.all([apiFetch("/api/bank-soal"), apiFetch("/api/bank-soal/kelompok")]);
      setButirList(Array.isArray(data) ? data : []);
      setKelompokList(Array.isArray(kelompok) ? kelompok : []);
    } catch {
      setButirList([]);
      setKelompokList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBank();
  }, []);

  const { ada: kelompokTerbuka, toggle: bukaTutup } = useBukaTutup();
  const grup = useMemo(() => kelompokkan(butirList, kelompokList), [butirList, kelompokList]);

  async function handleDelete(id: string) {
    if (!confirm(t.bankSoal.konfirmasiHapus)) return;
    setPesanHapus("");
    try {
      await apiFetch(`/api/bank-soal/${id}`, { method: "DELETE" });
      await loadBank();
    } catch (err: any) {
      setPesanHapus(err.message || t.bankSoal.hapusGagal);
    }
  }

  async function handleExport(format: "pdf" | "docx" | "json") {
    setPesanHapus("");
    setMengekspor(format);
    try {
      await unduhBerkas(
        `/api/bank-soal/export?format=${format}&kunci=${denganKunci}`,
        `bank_soal.${format}`
      );
    } catch (err: any) {
      setPesanHapus(err.message || t.bankSoal.eksporGagal);
    } finally {
      setMengekspor(null);
    }
  }

  return (
    <div>
      <PageHeader
        title={t.bankSoal.judul}
        description={t.bankSoal.deskripsi}
        action={
          butirList.length > 0 ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <label className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={denganKunci}
                  onChange={(e) => setDenganKunci(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                {t.bankSoal.sertakanKunci}
              </label>
              {(["pdf", "docx", "json"] as const).map((f) => (
                <Button
                  key={f}
                  variant="secondary"
                  size="sm"
                  disabled={mengekspor !== null}
                  onClick={() => handleExport(f)}
                >
                  {mengekspor === f ? t.bankSoal.menyiapkan : t.bankSoal.ekspor(f.toUpperCase())}
                </Button>
              ))}
              <Link href="/rakit-ujian">
                <Button size="sm">{t.bankSoal.rakitUjian}</Button>
              </Link>
            </div>
          ) : undefined
        }
      />

      {pesanHapus && (
        <div className="p-3 mb-4 text-xs leading-relaxed text-[#A4262C]">
          {pesanHapus}
        </div>
      )}

      {loading ? (
        <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono">
          {t.bankSoal.memuat}
        </div>
      ) : butirList.length === 0 ? (
        <EmptyState
          title={t.bankSoal.kosongJudul}
          description={t.bankSoal.kosongDeskripsi}
          action={
            <Link href="/kisi-kisi">
              <Button size="sm">{t.bankSoal.buatKisiKisiBaru}</Button>
            </Link>
          }
        />
      ) : (
        <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {grup.map((g) => (
            <KelompokLipat
              key={g.kelompok.id}
              kelompok={g.kelompok}
              jumlah={g.butir.length}
              terbuka={kelompokTerbuka(g.kelompok.id)}
              onToggle={() => bukaTutup(g.kelompok.id)}
            >
              <div className="border border-[var(--line)] bg-[var(--canvas)] overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-[var(--surface)] border-b border-[var(--line)]">
              <tr>
                <th className="w-12 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] font-mono">
                  #
                </th>
                <th className="px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                  {t.bankSoal.kolom.pertanyaan}
                </th>
                <th className="w-20 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                  {t.bankSoal.kolom.bloom}
                </th>
                <th className="w-20 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] text-right font-mono">
                  {t.bankSoal.kolom.bobot}
                </th>
                <th className="w-40 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                  {t.bankSoal.kolom.prediksiKesukaran}
                </th>
                <th className="w-28 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                  {t.bankSoal.kolom.status}
                </th>
                <th className="w-32 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] text-right">
                  {t.bankSoal.kolom.aksi}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {g.butir.map((butir, idx) => {
                const kesukaranPct =
                  butir.prediksi_kesukaran !== null &&
                  butir.prediksi_kesukaran !== undefined
                    ? Math.round(butir.prediksi_kesukaran * 100)
                    : null;
                const isExpanded = expandedId === butir.id;

                return (
                  <React.Fragment key={butir.id}>
                    <tr
                      className={`transition-colors duration-140 ${
                        isExpanded ? "bg-[var(--surface)]/90" : "hover:bg-[var(--surface)]/60"
                      }`}
                    >
                      <td className="px-3 py-2.5 font-mono text-xs text-[var(--ink-muted)] tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2.5 max-w-md">
                        <p className="font-serif text-sm text-[var(--ink)] line-clamp-2 leading-relaxed">
                          <MathText text={butir.pertanyaan} />
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <BloomChip level={butir.level_bloom} target={butir.level_target} />
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-[var(--ink)]">
                        {butir.bobot_poin ?? 1}
                      </td>
                      <td className="px-3 py-2.5">
                        {kesukaranPct !== null ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs tabular-nums text-[var(--ink)] w-9 text-right">
                              {kesukaranPct}%
                            </span>
                            <div className="h-1.5 w-16 bg-[var(--line)] rounded-none overflow-hidden">
                              <div
                                className="bg-[var(--accent)] h-full"
                                style={{ width: `${kesukaranPct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--ink-muted)] font-mono">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={butir.status} />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() =>
                              setExpandedId(isExpanded ? null : butir.id)
                            }
                            className="text-xs text-[var(--accent)] hover:underline font-medium focus-visible:outline-none"
                          >
                            {isExpanded ? t.bankSoal.tutup : t.bankSoal.lihatSoal}
                          </button>
                          <button
                            onClick={() => setEditing(butir)}
                            className="text-xs text-[var(--accent)] hover:underline font-medium focus-visible:outline-none"
                          >
                            {t.bankSoal.edit}
                          </button>
                          <button
                            onClick={() => handleDelete(butir.id)}
                            className="text-xs text-[var(--ink-muted)] hover:text-[#A4262C] transition-colors underline focus-visible:outline-none"
                          >
                            {t.bankSoal.hapus}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-[var(--surface)]">
                        <td colSpan={7} className="p-6 border-b border-[var(--line)]">
                          <div className="max-w-3xl space-y-4">
                            <div>
                              <span className="font-sans text-xs font-semibold text-[var(--ink-muted)] block mb-1">
                                {t.bankSoal.pertanyaanNaskah}
                              </span>
                              <p className="font-serif text-base text-[var(--ink)] leading-relaxed">
                                <MathText text={butir.pertanyaan} />
                              </p>
                            </div>

                            {butir.pilihan && (
                              <div className="space-y-1.5 pt-2">
                                <span className="font-sans text-xs font-semibold text-[var(--ink-muted)] block mb-1">
                                  {t.bankSoal.opsiJawaban}
                                </span>
                                {Object.entries(butir.pilihan).map(([key, val]) => {
                                  const isKey = key === butir.kunci_jawaban;
                                  return (
                                    <div
                                      key={key}
                                      className={`flex items-start gap-3 p-2.5 rounded text-sm transition-colors ${
                                        isKey
                                          ? "border border-transparent text-[#1F6B3A] font-medium"
                                          : "bg-[var(--canvas)] border border-[var(--line)] text-[var(--ink)]"
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
                                          title={t.umum.kunciJawaban}
                                        >
                                          <Lock size={14} strokeWidth={2} aria-label={t.umum.kunciJawaban} />
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {butir.pembahasan && (
                              <div className="bg-[var(--canvas)] border border-[var(--line)] p-4 text-xs mt-3">
                                <div className="font-sans text-xs font-medium text-[var(--ink-muted)] mb-1">
                                  {t.bankSoal.pembahasanNaskah}
                                </div>
                                <p className="font-serif text-[var(--ink)] leading-relaxed text-sm">
                                  <MathText text={butir.pembahasan} />
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
            </KelompokLipat>
          ))}
        </div>
      )}

      <EditButirDialog
        butir={editing}
        onClose={() => setEditing(null)}
        onSaved={(baru) => {
          setButirList((prev) => prev.map((b) => (b.id === baru.id ? baru : b)));
          setEditing(null);
        }}
      />
    </div>
  );
}
