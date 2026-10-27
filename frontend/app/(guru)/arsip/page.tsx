"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ArsipSoal } from "@/lib/types";
import { useFormat } from "@/lib/format";
import { useTeks } from "@/lib/teks";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import MathText from "@/components/ui/MathText";

export default function ArsipPage() {
  const t = useTeks().sistem.arsip;
  const { waktu } = useFormat();
  const [items, setItems] = useState<ArsipSoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [galat, setGalat] = useState("");
  const [bukaId, setBukaId] = useState<string | null>(null);

  const muat = useCallback(async () => {
    try {
      const data: ArsipSoal[] = await apiFetch("/api/arsip");
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setGalat(err.message || t.gagalMuat);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  async function hapus(id: string) {
    if (!confirm(t.konfirmasiHapus)) return;
    setGalat("");
    try {
      await apiFetch(`/api/arsip/${id}`, { method: "DELETE" });
      await muat();
    } catch (err: any) {
      setGalat(err.message || t.gagalHapus);
    }
  }

  return (
    <div>
      <PageHeader
        title={t.judul}
        description={t.deskripsi}
      />

      {galat && (
        <div role="alert" className="mb-4 text-xs leading-relaxed text-[#A4262C]">
          {galat}
        </div>
      )}

      {loading ? (
        <p className="font-mono text-xs text-[var(--ink-muted)]">{t.memuat}</p>
      ) : items.length === 0 ? (
        <EmptyState
          title={t.kosongJudul}
          description={t.kosongDeskripsi}
          action={
            <Link href="/riwayat-diterima">
              <Button size="sm">{t.bukaRiwayat}</Button>
            </Link>
          }
        />
      ) : (
        <div className="max-w-3xl space-y-3">
          {items.map((a, i) => {
            const terbuka = bukaId === a.id;
            return (
              <article key={a.id} className="border border-[var(--line)] bg-[var(--canvas)]">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-xs text-[var(--ink-muted)]">
                  <span className="font-mono tabular-nums text-[var(--ink)]">#{i + 1}</span>
                  <span className="font-serif text-[var(--ink)]">{a.kisi_kisi_label}</span>
                  <span>
                    {t.ronde(a.ronde ?? "-")}
                    {a.asal_status && ` · ${t.asal[a.asal_status] ?? a.asal_status}`}
                  </span>
                  <span className="ml-auto font-mono tabular-nums">{waktu(a.created_at)}</span>
                </div>
                <div className="space-y-3 px-4 py-3">
                  <p className={`font-serif text-[15px] leading-relaxed text-[var(--ink)] ${terbuka ? "" : "line-clamp-2"}`}>
                    <MathText text={a.pertanyaan} />
                  </p>
                  {terbuka && (
                    <>
                      <ul className="space-y-1">
                        {Object.entries(a.pilihan).map(([k, v]) => (
                          <li
                            key={k}
                            className={`flex gap-3 text-sm ${k === a.kunci_jawaban ? "font-medium text-[#1F6B3A]" : "text-[var(--ink)]"}`}
                          >
                            <span className="w-5 shrink-0 pt-0.5 font-mono text-xs font-semibold">{k}.</span>
                            <span className="font-serif">
                              <MathText text={v} />
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="font-mono text-xs text-[var(--ink-muted)]">
                        {t.kunciPenyusun(a.kunci_jawaban)}
                        {a.jawaban_penjawab_buta && (
                          <>
                            {" "}
                            · {t.penjawabButaMenjawab(a.jawaban_penjawab_buta)}
                            {a.keyakinan_penjawab_buta != null && ` (${t.keyakinan(a.keyakinan_penjawab_buta)})`}
                            {` · ${a.jawaban_penjawab_buta === a.kunci_jawaban ? t.sesuaiKunci : t.tidakSesuaiKunci}`}
                          </>
                        )}
                      </p>
                      {a.pembahasan && (
                        <p className="border-t border-[var(--line)] pt-2 font-serif text-xs leading-relaxed text-[var(--ink-muted)]">
                          <span className="font-sans font-semibold text-[var(--ink)]">{t.pembahasan}</span>
                          <MathText text={a.pembahasan} />
                        </p>
                      )}
                    </>
                  )}
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" aria-expanded={terbuka} onClick={() => setBukaId(terbuka ? null : a.id)}>
                      {terbuka ? t.tutup : t.lihatLengkap}
                    </Button>
                    {a.sumber_butir_id && (
                      <Link
                        href={`/debat/${a.sumber_butir_id}?dari=riwayat-diterima`}
                        className="rounded px-2 py-1 font-sans text-xs font-medium text-[var(--accent)] underline-offset-4 hover:underline focus-visible:outline-none"
                      >
                        {t.lihatDebat}
                      </Link>
                    )}
                    <Button size="sm" variant="danger" className="ml-auto" onClick={() => hapus(a.id)}>
                      {t.hapus}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
