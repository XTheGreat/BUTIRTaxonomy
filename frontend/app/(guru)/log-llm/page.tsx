"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useFormat } from "@/lib/format";
import { useTeks } from "@/lib/teks";
import { LogLLMEntry, RingkasanLogLLM } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";


export default function LogLLMPage() {
  const t = useTeks().sistem.logLlm;
  const PERAN_LABEL = t.peran;
  const STATUS_LABEL = t.status;
  const { waktu, angka } = useFormat();
  const detik = (ms: number | null) => (ms === null ? "-" : t.detik((ms / 1000).toFixed(1)));
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
      setGalat(err.message || t.gagalMuat);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        title={t.judul}
        description={t.deskripsi}
        action={
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--ink-muted)]" htmlFor="rentang">
              {t.rentang}
            </label>
            <select
              id="rentang"
              value={hari}
              onChange={(e) => setHari(parseInt(e.target.value))}
              className="bg-[var(--canvas)] text-[var(--ink)] border border-[var(--line-strong)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--accent)]"
            >
              <option value={7}>{t.hari(7)}</option>
              <option value={30}>{t.hari(30)}</option>
              <option value={90}>{t.hari(90)}</option>
            </select>
          </div>
        }
      />

      {galat && (
        <div className="mb-4 text-xs leading-relaxed text-[#A4262C]">{galat}</div>
      )}

      {loading && !ringkasan ? (
        <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono">
          {t.memuat}
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
                { label: t.ringkasan.permintaan, nilai: angka(ringkasan.total_permintaan), ket: t.ringkasan.hariTerakhir(hari) },
                { label: t.ringkasan.gagal, nilai: angka(ringkasan.total_gagal), ket: t.ringkasan.persenPermintaan(persenGagal) },
                { label: t.ringkasan.token, nilai: angka(ringkasan.total_token), ket: t.ringkasan.promptJawaban },
                {
                  label: t.ringkasan.rondeLewat,
                  nilai: ringkasan.ronde.jumlah ? `${ringkasan.ronde.melewati_batas}/${ringkasan.ronde.jumlah}` : "-",
                  ket: t.ringkasan.target(ringkasan.ronde.batas_detik),
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
                <span className="font-semibold text-[var(--ink)]">{t.durasi.judul}</span>
                {[
                  { awal: t.durasi.rataRata, nilai: ringkasan.ronde.rata_rata_detik, akhir: t.durasi.dtk },
                  { awal: t.durasi.p95, nilai: ringkasan.ronde.p95_detik, akhir: t.durasi.dtk },
                  { awal: t.durasi.maks, nilai: ringkasan.ronde.maks_detik, akhir: t.durasi.dtk },
                  { awal: "", nilai: ringkasan.ronde.persen_melewati_batas, akhir: t.durasi.melewati(ringkasan.ronde.batas_detik) },
                ].map((s, i, semua) => (
                  <span key={i} className="font-mono tabular-nums">
                    {s.awal && `${s.awal} `}
                    <span className="font-semibold text-[var(--ink)] underline underline-offset-4 decoration-[var(--accent)]/60">
                      {s.nilai === null ? "-" : angka(s.nilai)}
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
                {t.penugasan.judul}
              </h2>
              <div className="border border-[var(--line)] bg-[var(--canvas)] overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-[var(--surface)] border-b border-[var(--line)]">
                    <tr className="text-xs text-[var(--ink-muted)]">
                      <th className="px-3 py-2 font-medium">{t.penugasan.peran}</th>
                      <th className="px-3 py-2 font-medium">{t.penugasan.kelompok}</th>
                      <th className="px-3 py-2 font-medium">{t.penugasan.penyedia}</th>
                      <th className="px-3 py-2 font-medium">{t.penugasan.model}</th>
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
                                <span className="ml-2 text-[#8A5A00]" title={t.penugasan.fallbackTitle}>
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
                {t.rekap.judul}
              </h2>
              {ringkasan.rincian.length === 0 ? (
                <p className="text-xs text-[var(--ink-muted)]">{t.rekap.kosong}</p>
              ) : (
                <div className="border border-[var(--line)] bg-[var(--canvas)] overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-[var(--surface)] border-b border-[var(--line)]">
                      <tr className="text-xs text-[var(--ink-muted)]">
                        <th className="px-3 py-2 font-medium">{t.rekap.penyediaModel}</th>
                        <th className="px-3 py-2 font-medium">{t.rekap.peran}</th>
                        <th className="px-3 py-2 font-medium text-right">{t.rekap.permintaan}</th>
                        <th className="px-3 py-2 font-medium text-right">{t.rekap.gagal}</th>
                        <th className="px-3 py-2 font-medium text-right">{t.rekap.batasLaju}</th>
                        <th className="px-3 py-2 font-medium text-right">{t.rekap.token}</th>
                        <th className="px-3 py-2 font-medium text-right">{t.rekap.latensiRata}</th>
                        <th className="px-3 py-2 font-medium text-right">{t.rekap.latensiMaks}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line)] font-mono text-xs tabular-nums">
                      {ringkasan.rincian.map((r) => (
                        <tr key={`${r.provider}-${r.model}-${r.peran}`}>
                          <td className="px-3 py-2">
                            {r.provider} <span className="text-[var(--ink-muted)]">/ {r.model}</span>
                            {r.lewat_fallback > 0 && <span className="ml-2 text-[#8A5A00]">{t.rekap.fallback(r.lewat_fallback)}</span>}
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
                <h2 className="font-serif text-lg font-normal text-[var(--ink)]">{t.terbaru.judul}</h2>
                <div className="flex items-center gap-2 text-xs">
                  <select
                    aria-label={t.terbaru.saringStatus}
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-[var(--canvas)] text-[var(--ink)] border border-[var(--line-strong)] rounded px-2 py-1 focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">{t.terbaru.semuaStatus}</option>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={t.terbaru.saringPeran}
                    value={filterPeran}
                    onChange={(e) => setFilterPeran(e.target.value)}
                    className="bg-[var(--canvas)] text-[var(--ink)] border border-[var(--line-strong)] rounded px-2 py-1 focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">{t.terbaru.semuaPeran}</option>
                    {Object.entries(PERAN_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {log.length === 0 ? (
                <p className="text-xs text-[var(--ink-muted)]">{t.terbaru.kosong}</p>
              ) : (
                <div className="border border-[var(--line)] bg-[var(--canvas)] overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-[var(--surface)] border-b border-[var(--line)]">
                      <tr className="text-xs text-[var(--ink-muted)]">
                        <th className="px-3 py-2 font-medium">{t.terbaru.waktu}</th>
                        <th className="px-3 py-2 font-medium">{t.terbaru.peran}</th>
                        <th className="px-3 py-2 font-medium">{t.terbaru.model}</th>
                        <th className="px-3 py-2 font-medium">{t.terbaru.status}</th>
                        <th className="px-3 py-2 font-medium text-right">{t.terbaru.latensi}</th>
                        <th className="px-3 py-2 font-medium text-right">{t.terbaru.token}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line)] font-mono text-xs tabular-nums">
                      {log.map((b, i) => (
                        <tr key={`${b.waktu}-${i}`}>
                          <td className="px-3 py-2 whitespace-nowrap">{waktu(b.waktu)}</td>
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
                              <span className="ml-1 text-[var(--ink-muted)]">{t.terbaru.percobaan(b.percobaan_panggilan)}</span>
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
