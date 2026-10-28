"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { PaketUjian } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useTeks } from "@/lib/teks";
import { susunNomorHalaman } from "@/lib/pagination";

const UJIAN_PER_HALAMAN = 13;

export default function DaftarUjianPage() {
  const t = useTeks().ujian;
  const [ujianList, setUjianList] = useState<PaketUjian[]>([]);
  const [loading, setLoading] = useState(true);
  const [halaman, setHalaman] = useState(1);

  useEffect(() => {
    apiFetch("/api/ujian")
      .then((data) => setUjianList(Array.isArray(data) ? data : []))
      .catch(() => setUjianList([]))
      .finally(() => setLoading(false));
  }, []);

  const jumlahHalaman = Math.max(1, Math.ceil(ujianList.length / UJIAN_PER_HALAMAN));
  const halamanAktif = Math.min(halaman, jumlahHalaman);
  const indeksAwal = (halamanAktif - 1) * UJIAN_PER_HALAMAN;
  const ujianTerlihat = ujianList.slice(indeksAwal, indeksAwal + UJIAN_PER_HALAMAN);
  const nomorHalaman = susunNomorHalaman(halamanAktif, jumlahHalaman);

  function bukaHalaman(berikut: number) {
    setHalaman(berikut);
    document.getElementById("daftar-paket-ujian")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function navigasiHalaman(className = "") {
    if (jumlahHalaman <= 1) return null;
    return (
      <nav aria-label={t.daftar.navigasiHalaman} className={`flex flex-wrap items-center justify-between gap-3 border-y border-[var(--line)] py-2.5 ${className}`}>
        <span className="text-xs text-[var(--ink-muted)] tabular-nums">
          {t.daftar.rentang(indeksAwal + 1, indeksAwal + ujianTerlihat.length, ujianList.length)}
        </span>
        <div className="flex items-center justify-end gap-1">
          <Button type="button" size="sm" variant="secondary" className="!h-7 !w-7 !p-0 shrink-0" aria-label={t.daftar.sebelumnya} disabled={halamanAktif === 1} onClick={() => bukaHalaman(halamanAktif - 1)}>
            ‹
          </Button>
          <div role="group" aria-label={t.daftar.navigasiHalaman} className="flex items-center gap-0.5">
            {nomorHalaman.map((nomor, indeks) => typeof nomor === "number" ? (
              <button
                key={nomor}
                type="button"
                aria-label={t.daftar.halaman(nomor, jumlahHalaman)}
                aria-current={nomor === halamanAktif ? "page" : undefined}
                onClick={() => bukaHalaman(nomor)}
                className={`inline-flex h-7 min-w-6 items-center justify-center border px-1 font-mono text-xs tabular-nums transition-colors duration-[140ms] ${nomor === halamanAktif ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]" : "border-[var(--line-strong)] bg-[var(--canvas)] text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"}`}
              >
                {nomor}
              </button>
            ) : (
              <span key={`${nomor}-${indeks}`} className="px-1 text-xs text-[var(--ink-muted)]" aria-hidden="true">…</span>
            ))}
          </div>
          <Button type="button" size="sm" variant="secondary" className="!h-7 !w-7 !p-0 shrink-0" aria-label={t.daftar.berikutnya} disabled={halamanAktif === jumlahHalaman} onClick={() => bukaHalaman(halamanAktif + 1)}>
            ›
          </Button>
        </div>
      </nav>
    );
  }

  return (
    <div>
      <PageHeader
        title={t.daftar.judul}
        description={t.daftar.deskripsi}
        action={
          <Link href="/rakit-ujian">
            <Button size="sm">{t.daftar.rakitBaru}</Button>
          </Link>
        }
      />

      {loading ? (
        <SkeletonTable rows={4} cols={5} />
      ) : ujianList.length === 0 ? (
        <EmptyState
          title={t.daftar.kosongJudul}
          description={t.daftar.kosongDeskripsi}
          action={
            <Link href="/rakit-ujian">
              <Button size="sm">{t.daftar.rakitPertama}</Button>
            </Link>
          }
        />
      ) : (
        <>
        <div id="daftar-paket-ujian" className="border border-[var(--line)] bg-[var(--canvas)] overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--line)]">
              <tr>
                <th className="w-12 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] font-mono">
                  #
                </th>
                <th className="px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                  {t.daftar.kolom.judulPaket}
                </th>
                <th className="w-28 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                  {t.daftar.kolom.status}
                </th>
                <th className="w-28 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] text-center font-mono">
                  {t.daftar.kolom.soal}
                </th>
                <th className="w-28 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] text-center font-mono">
                  {t.daftar.kolom.durasi}
                </th>
                <th className="w-36 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] font-mono">
                  {t.daftar.kolom.kodeAkses}
                </th>
                <th className="w-36 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] font-mono">
                  {t.daftar.kolom.dibuat}
                </th>
                <th className="w-28 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] text-right">
                  {t.daftar.kolom.aksi}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {ujianTerlihat.map((ujian, idx) => (
                <tr
                  key={ujian.id}
                  className="hover:bg-[var(--surface)]/60 transition-colors duration-[140ms]"
                >
                  <td className="px-3 py-2.5 font-mono text-xs text-[var(--ink-muted)] tabular-nums">
                    {indeksAwal + idx + 1}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-serif text-sm text-[var(--ink)] font-medium">
                      {ujian.judul}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={ujian.status} />
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-xs tabular-nums text-[var(--ink)]">
                    {ujian.butir_list?.length || 0}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-xs tabular-nums text-[var(--ink)]">
                    {t.daftar.menit(ujian.durasi_menit)}
                  </td>
                  <td className="px-3 py-2.5">
                    {ujian.kode_akses ? (
                      <code className="font-mono text-xs font-semibold text-[var(--ink)] bg-[var(--surface)] border border-[var(--line)] px-2 py-0.5 rounded select-all">
                        {ujian.kode_akses}
                      </code>
                    ) : (
                      <span className="text-xs text-[var(--ink-muted)] font-mono">
                        -
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-[var(--ink-muted)]">
                    {new Date(ujian.created_at).toLocaleDateString(t.lokal, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/ujian/${ujian.id}`}
                        className="text-xs text-[var(--accent-text)] hover:underline font-medium"
                      >
                        {t.daftar.detail}
                      </Link>
                      {ujian.status === "aktif" && (
                        <Link
                          href={`/laporan/${ujian.id}`}
                          className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] underline"
                        >
                          {t.daftar.laporan}
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {navigasiHalaman("mt-3")}
        </>
      )}
    </div>
  );
}
