"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatWaktu } from "@/lib/format";
import { LogLLMEntry, RingkasanLogLLM } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";

const PERAN_LABEL: Record<string, string> = {
  penyusun: "Penyusun",
  kritikus: "Kritikus",
  penjawab_buta: "Penjawab Buta",
  arbiter: "Arbiter",
};

const STATUS_LABEL: Record<string, string> = {
  sukses: "Berhasil",
  rate_limit: "Dibatasi layanan",
  timeout: "Terlalu lama membalas",
  galat_jaringan: "Tidak terhubung",
  galat_server: "Layanan bermasalah",
  galat_http: "Ditolak layanan",
  json_tidak_valid: "Jawaban tidak valid",
  skema_tidak_valid: "Isi jawaban salah",
};

const angka = (n: number) => n.toLocaleString("id-ID");
const detik = (ms: number | null) => (ms === null ? "-" : `${(ms / 1000).toFixed(1)} dtk`);

export default function LogLLMPage() {
  const [hari, setHari] = useState(30);
  const [ringkasan, setRingkasan] = useState<RingkasanLogLLM | null>(null);
  const [log, setLog] = useState<LogLLMEntry[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPeran, setFilterPeran] = useState("");
  const [loading, setLoading] = useState(true);
  const [galat, setGalat] = useState("");

  const muat = useCallback(async () => {
    setLoading(true);
    setGalat("");
    try {
      const q = new URLSearchParams({ limit: "50" });
      if (filterStatus) q.set("status", filterStatus);
      if (filterPeran) q.set("peran", filterPeran);
      const [r, l] = await Promise.all([
        apiFetch(`/api/log-llm/ringkasan?hari=${hari}`),
        apiFetch(`/api/log-llm?${q.toString()}`),
      ]);
      setRingkasan(r);
      setLog(Array.isArray(l) ? l : []);
    } catch (err: any) {
      setGalat(err.message || "Gagal memuat log.");
    } finally {
      setLoading(false);
    }
  }, [hari, filterStatus, filterPeran]);

  useEffect(() => {
    muat();
  }, [muat]);

  const persenGagal =
    ringkasan && ringkasan.total_permintaan > 0
      ? Math.round((100 * ringkasan.total_gagal) / ringkasan.total_permintaan)
      : 0;

  return (
    <div>
      <PageHeader
        title="Log Panggilan LLM"
        description="Audit biaya dan kinerja permintaan ke penyedia model AI. Isi prompt dan kunci API tidak disimpan."
        action={
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--ink-muted)]" htmlFor="rentang">
              Rentang
            </label>
            <select
              id="rentang"
              value={hari}
              onChange={(e) => setHari(parseInt(e.target.value))}
              className="bg-[var(--canvas)] text-[var(--ink)] border border-[var(--line-strong)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--accent)]"
            >
              <option value={7}>7 hari</option>
              <option value={30}>30 hari</option>
              <option value={90}>90 hari</option>
            </select>
          </div>
        }
      />

      {galat && (
        <div className="mb-4 text-xs leading-relaxed text-[#A4262C]">{galat}</div>
      )}

      {loading && !ringkasan ? (
        <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono">
          Memuat log...
        </div>
      ) : (
        ringkasan && (
          <div className="space-y-8">
            {ringkasan.admin && ringkasan.peringatan.length > 0 && (
              <div className="p-3 border border-[#8A5A00]/30 bg-[#FBF1D9] text-xs text-[#8A5A00] space-y-1">
                {ringkasan.peringatan.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            )}

            <section className="border border-[var(--line)] bg-[var(--surface)] grid grid-cols-2 sm:grid-cols-4 divide-x divide-[var(--line)]">
              {[
                { label: "Permintaan", nilai: angka(ringkasan.total_permintaan), ket: `${hari} hari terakhir` },
                { label: "Gagal", nilai: angka(ringkasan.total_gagal), ket: `${persenGagal}% dari permintaan` },
                { label: "Token", nilai: angka(ringkasan.total_token), ket: "prompt & jawaban" },
                {
                  label: "Ronde lewat batas",
                  nilai: ringkasan.ronde.jumlah ? `${ringkasan.ronde.melewati_batas}/${ringkasan.ronde.jumlah}` : "-",
                  ket: `target ${ringkasan.ronde.batas_detik} detik`,
                },
              ].map((s) => (
                <div key={s.label} className="p-5">
                  <span className="text-xs font-medium text-[var(--ink-muted)] block mb-1">{s.label}</span>
                  <div className="font-serif text-3xl font-normal text-[var(--ink)] tabular-nums">{s.nilai}</div>
                  <p className="text-xs text-[var(--ink-muted)] mt-1">{s.ket}</p>
                </div>
              ))}
            </section>

            {ringkasan.ronde.jumlah > 0 && (
              <p className="-mt-4 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-xs text-[var(--ink-muted)]">
                <span className="font-semibold text-[var(--ink)]">Durasi ronde debat:</span>
                {[
                  { awal: "rata-rata", nilai: ringkasan.ronde.rata_rata_detik, akhir: "dtk" },
                  { awal: "P95", nilai: ringkasan.ronde.p95_detik, akhir: "dtk" },
                  { awal: "maks", nilai: ringkasan.ronde.maks_detik, akhir: "dtk" },
                  { awal: "", nilai: ringkasan.ronde.persen_melewati_batas, akhir: `% melewati ${ringkasan.ronde.batas_detik} dtk` },
                ].map((s, i, semua) => (
                  <span key={i} className="font-mono tabular-nums">
                    {s.awal && `${s.awal} `}
                    <span className="font-semibold text-[var(--ink)] underline underline-offset-4 decoration-[var(--accent)]/60">
                      {s.nilai === null ? "-" : s.nilai.toLocaleString("id-ID")}
                    </span>
                    {s.akhir.startsWith("%") ? s.akhir : ` ${s.akhir}`}
                    {i < semua.length - 1 && ";"}
                  </span>
                ))}
              </p>
            )}

            {ringkasan.admin && (
            <section>
              <h2 className="font-serif text-lg font-normal text-[var(--ink)] border-b border-[var(--line)] pb-2 mb-3">
                Penugasan Penyedia Saat Ini
              </h2>
              <div className="border border-[var(--line)] bg-[var(--canvas)] overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-[var(--surface)] border-b border-[var(--line)]">
                    <tr className="text-xs text-[var(--ink-muted)]">
                      <th className="px-3 py-2 font-medium">Peran</th>
                      <th className="px-3 py-2 font-medium">Kelompok</th>
                      <th className="px-3 py-2 font-medium">Penyedia</th>
                      <th className="px-3 py-2 font-medium">Model</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {ringkasan.penugasan.map((p) => (
                      <tr key={p.peran}>
                        <td className="px-3 py-2 font-serif">{PERAN_LABEL[p.peran] ?? p.peran}</td>
                        {p.galat ? (
                          <td colSpan={3} className="px-3 py-2 text-xs text-[#A4262C]">
                            {p.galat}
                          </td>
                        ) : (
                          <>
                            <td className="px-3 py-2 text-xs capitalize">{p.kelompok}</td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {p.provider}
                              {p.fallback && (
                                <span className="ml-2 text-[#8A5A00]" title="Dialihkan karena API key penyedia utama kosong">
                                  (fallback)
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">{p.model}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            )}

            <section>
              <h2 className="font-serif text-lg font-normal text-[var(--ink)] border-b border-[var(--line)] pb-2 mb-3">
                Rekap per Penyedia, Model, dan Peran
              </h2>
              {ringkasan.rincian.length === 0 ? (
                <p className="text-xs text-[var(--ink-muted)]">Belum ada permintaan pada rentang ini.</p>
              ) : (
                <div className="border border-[var(--line)] bg-[var(--canvas)] overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-[var(--surface)] border-b border-[var(--line)]">
                      <tr className="text-xs text-[var(--ink-muted)]">
                        <th className="px-3 py-2 font-medium">Penyedia / Model</th>
                        <th className="px-3 py-2 font-medium">Peran</th>
                        <th className="px-3 py-2 font-medium text-right">Permintaan</th>
                        <th className="px-3 py-2 font-medium text-right">Gagal</th>
                        <th className="px-3 py-2 font-medium text-right">Batas laju</th>
                        <th className="px-3 py-2 font-medium text-right">Token</th>
                        <th className="px-3 py-2 font-medium text-right">Latensi rata-rata</th>
                        <th className="px-3 py-2 font-medium text-right">Latensi maks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line)] font-mono text-xs tabular-nums">
                      {ringkasan.rincian.map((r) => (
                        <tr key={`${r.provider}-${r.model}-${r.peran}`}>
                          <td className="px-3 py-2">
                            {r.provider} <span className="text-[var(--ink-muted)]">/ {r.model}</span>
                            {r.lewat_fallback > 0 && <span className="ml-2 text-[#8A5A00]">fallback {r.lewat_fallback}</span>}
                          </td>
                          <td className="px-3 py-2 font-serif text-sm">{PERAN_LABEL[r.peran] ?? r.peran}</td>
                          <td className="px-3 py-2 text-right">{angka(r.permintaan)}</td>
                          <td className={`px-3 py-2 text-right ${r.gagal > 0 ? "text-[#A4262C]" : ""}`}>{angka(r.gagal)}</td>
                          <td className="px-3 py-2 text-right">{angka(r.rate_limit)}</td>
                          <td className="px-3 py-2 text-right">{angka(r.token_total)}</td>
                          <td className="px-3 py-2 text-right">{detik(r.latensi_rata_rata_ms)}</td>
                          <td className="px-3 py-2 text-right">{detik(r.latensi_maks_ms)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2 mb-3">
                <h2 className="font-serif text-lg font-normal text-[var(--ink)]">Permintaan Terbaru</h2>
                <div className="flex items-center gap-2 text-xs">
                  <select
                    aria-label="Saring menurut status"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-[var(--canvas)] text-[var(--ink)] border border-[var(--line-strong)] rounded px-2 py-1 focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">Semua status</option>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Saring menurut peran"
                    value={filterPeran}
                    onChange={(e) => setFilterPeran(e.target.value)}
                    className="bg-[var(--canvas)] text-[var(--ink)] border border-[var(--line-strong)] rounded px-2 py-1 focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">Semua peran</option>
                    {Object.entries(PERAN_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {log.length === 0 ? (
                <p className="text-xs text-[var(--ink-muted)]">Tidak ada permintaan yang cocok.</p>
              ) : (
                <div className="border border-[var(--line)] bg-[var(--canvas)] overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-[var(--surface)] border-b border-[var(--line)]">
                      <tr className="text-xs text-[var(--ink-muted)]">
                        <th className="px-3 py-2 font-medium">Waktu</th>
                        <th className="px-3 py-2 font-medium">Peran</th>
                        <th className="px-3 py-2 font-medium">Model</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium text-right">Latensi</th>
                        <th className="px-3 py-2 font-medium text-right">Token</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line)] font-mono text-xs tabular-nums">
                      {log.map((b, i) => (
                        <tr key={`${b.waktu}-${i}`}>
                          <td className="px-3 py-2 whitespace-nowrap">{formatWaktu(b.waktu)}</td>
                          <td className="px-3 py-2 font-serif text-sm">
                            {PERAN_LABEL[b.peran] ?? b.peran}
                            {b.ronde ? <span className="ml-1 font-mono text-[11px] text-[var(--ink-muted)]">r{b.ronde}</span> : null}
                          </td>
                          <td className="px-3 py-2">
                            {b.model}
                            {b.fallback && <span className="ml-2 text-[#8A5A00]">fallback</span>}
                          </td>
                          <td className="px-3 py-2" title={b.galat ?? undefined}>
                            <span className={b.status === "sukses" ? "text-[#1F6B3A]" : "text-[#A4262C]"}>
                              {STATUS_LABEL[b.status] ?? b.status}
                              {b.kode_http && b.status !== "sukses" ? ` ${b.kode_http}` : ""}
                            </span>
                            {b.percobaan_panggilan > 1 && (
                              <span className="ml-1 text-[var(--ink-muted)]">percobaan {b.percobaan_panggilan}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">{detik(b.latensi_ms)}</td>
                          <td className="px-3 py-2 text-right">{b.token_total === null ? "-" : angka(b.token_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )
      )}
    </div>
  );
}
