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

export default function DaftarUjianPage() {
  const t = useTeks().ujian;
  const [ujianList, setUjianList] = useState<PaketUjian[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/ujian")
      .then((data) => setUjianList(Array.isArray(data) ? data : []))
      .catch(() => setUjianList([]))
      .finally(() => setLoading(false));
  }, []);

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
        <div className="border border-[var(--line)] bg-[var(--canvas)] overflow-x-auto">
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
              {ujianList.map((ujian, idx) => (
                <tr
                  key={ujian.id}
                  className="hover:bg-[var(--surface)]/60 transition-colors duration-[140ms]"
                >
                  <td className="px-3 py-2.5 font-mono text-xs text-[var(--ink-muted)] tabular-nums">
                    {idx + 1}
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
      )}
    </div>
  );
}
