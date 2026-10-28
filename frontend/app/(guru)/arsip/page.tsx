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
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MathText from "@/components/ui/MathText";
import { susunNomorHalaman } from "@/lib/pagination";

const ARSIP_PER_HALAMAN = 7;

export default function ArsipPage() {
  const t = useTeks().sistem.arsip;
  const { waktu } = useFormat();
  const [items, setItems] = useState<ArsipSoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [galat, setGalat] = useState("");
  const [bukaId, setBukaId] = useState<string | null>(null);
  const [targetHapus, setTargetHapus] = useState<ArsipSoal | null>(null);
  const [sedangHapus, setSedangHapus] = useState(false);
  const [halaman, setHalaman] = useState(1);

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

  async function hapus() {
    if (!targetHapus) return;
    setSedangHapus(true);
    setGalat("");
    try {
      await apiFetch(`/api/arsip/${targetHapus.id}`, { method: "DELETE" });
      setTargetHapus(null);
      await muat();
    } catch (err: any) {
      setGalat(err.message || t.gagalHapus);
    } finally {
      setSedangHapus(false);
    }
  }

  const jumlahHalaman = Math.max(1, Math.ceil(items.length / ARSIP_PER_HALAMAN));
  const halamanAktif = Math.min(halaman, jumlahHalaman);
  const indeksAwal = (halamanAktif - 1) * ARSIP_PER_HALAMAN;
  const arsipTerlihat = items.slice(indeksAwal, indeksAwal + ARSIP_PER_HALAMAN);
  const nomorHalaman = susunNomorHalaman(halamanAktif, jumlahHalaman);

  function bukaHalaman(berikut: number) {
    setHalaman(berikut);
    document.getElementById("arsip-soal-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const navigasiHalaman = jumlahHalaman > 1 && (
    <nav
      aria-label={t.navigasiHalaman}
      className="flex flex-wrap items-center justify-between gap-3 border-y border-[var(--line)] py-2.5"
    >
      <span className="text-xs text-[var(--ink-muted)] tabular-nums">
        {t.rentang(indeksAwal + 1, indeksAwal + arsipTerlihat.length, items.length)}
      </span>
      <div className="flex items-center justify-end gap-1">
        <Button type="button" size="sm" variant="secondary" className="!h-7 !w-7 !p-0 shrink-0" aria-label={t.sebelumnya} disabled={halamanAktif === 1} onClick={() => bukaHalaman(halamanAktif - 1)}>
          ‹
        </Button>
        <div role="group" aria-label={t.navigasiHalaman} className="flex items-center gap-0.5">
          {nomorHalaman.map((nomor, indeks) => typeof nomor === "number" ? (
            <button
              key={nomor}
              type="button"
              aria-label={t.halaman(nomor, jumlahHalaman)}
              aria-current={nomor === halamanAktif ? "page" : undefined}
              onClick={() => bukaHalaman(nomor)}
              className={`inline-flex h-7 min-w-6 items-center justify-center border px-1 font-mono text-xs tabular-nums transition-colors duration-[140ms] ${
                nomor === halamanAktif
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
                  : "border-[var(--line-strong)] bg-[var(--canvas)] text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
              }`}
            >
              {nomor}
            </button>
          ) : (
            <span key={`${nomor}-${indeks}`} className="px-1 text-xs text-[var(--ink-muted)]" aria-hidden="true">
              …
            </span>
          ))}
        </div>
        <Button type="button" size="sm" variant="secondary" className="!h-7 !w-7 !p-0 shrink-0" aria-label={t.berikutnya} disabled={halamanAktif === jumlahHalaman} onClick={() => bukaHalaman(halamanAktif + 1)}>
          ›
        </Button>
      </div>
    </nav>
  );

  return (
    <div>
      <PageHeader
        title={t.judul}
        description={t.deskripsi}
      />

      {galat && (
        <div role="alert" className="mb-4 text-xs leading-relaxed text-[var(--status-ditolak)]">
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
        <div id="arsip-soal-list" className="w-full space-y-3">
          {arsipTerlihat.map((a, i) => {
            const terbuka = bukaId === a.id;
            return (
              <article key={a.id} className="border border-[var(--line)] bg-[var(--canvas)]">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-xs text-[var(--ink-muted)]">
                  <span className="font-mono tabular-nums text-[var(--ink)]">#{indeksAwal + i + 1}</span>
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
                            className={`flex gap-3 text-sm ${k === a.kunci_jawaban ? "font-medium text-[var(--status-diterima)]" : "text-[var(--ink)]"}`}
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
                        className="rounded px-2 py-1 font-sans text-xs font-medium text-[var(--accent-text)] underline-offset-4 hover:underline focus-visible:outline-none"
                      >
                        {t.lihatDebat}
                      </Link>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      className="ml-auto"
                      onClick={() => {
                        setGalat("");
                        setTargetHapus(a);
                      }}
                    >
                      {t.hapus}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
          {navigasiHalaman}
        </div>
      )}

      <ConfirmDialog
        open={!!targetHapus}
        title={t.hapusDialog.judul}
        description={t.hapusDialog.deskripsi}
        confirmLabel={t.hapusDialog.konfirmasi}
        variant="destructive"
        loading={sedangHapus}
        onConfirm={hapus}
        onCancel={() => {
          setTargetHapus(null);
          setGalat("");
        }}
      >
        {galat && <p role="alert" className="text-xs leading-relaxed text-[var(--status-ditolak)]">{galat}</p>}
      </ConfirmDialog>
    </div>
  );
}
