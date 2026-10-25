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

export default function DaftarUjianPage() {
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
        title="Daftar Paket Ujian"
        description="Seluruh paket ujian yang telah disusun beserta status dan konfigurasi pelaksanaan."
        action={
          <Link href="/rakit-ujian">
            <Button size="sm">Rakit Ujian Baru</Button>
          </Link>
        }
      />

      {loading ? (
        <SkeletonTable rows={4} cols={5} />
      ) : ujianList.length === 0 ? (
        <EmptyState
          title="Belum ada paket ujian"
          description="Rakit paket ujian dari butir soal yang telah tervalidasi di bank soal."
          action={
            <Link href="/rakit-ujian">
              <Button size="sm">Rakit Ujian Pertama</Button>
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
                  Judul Paket
                </th>
                <th className="w-28 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                  Status
                </th>
                <th className="w-28 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] text-center font-mono">
                  Soal
                </th>
                <th className="w-28 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] text-center font-mono">
                  Durasi
                </th>
                <th className="w-36 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] font-mono">
                  Kode Akses
                </th>
                <th className="w-36 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] font-mono">
                  Dibuat
                </th>
                <th className="w-28 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] text-right">
                  Aksi
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
                    {ujian.durasi_menit} mnt
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
                    {new Date(ujian.created_at).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/ujian/${ujian.id}`}
                        className="text-xs text-[var(--accent)] hover:underline font-medium"
                      >
                        Detail
                      </Link>
                      {ujian.status === "aktif" && (
                        <Link
                          href={`/laporan/${ujian.id}`}
                          className="text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] underline"
                        >
                          Laporan
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
