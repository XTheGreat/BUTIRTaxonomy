"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, History } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatWaktu } from "@/lib/format";
import { HistoryDebatTerakhir } from "@/lib/types";
import MathText from "@/components/ui/MathText";
import {
  Kotak,
  PipRonde,
  RingkasanStatus,
  STATUS_HISTORY,
  warnaPenanda,
  warnaStatus,
} from "@/components/ui/HistoryParts";

export default function HistoryDebat() {
  const pathname = usePathname();
  const [data, setData] = useState<HistoryDebatTerakhir | null>(null);

  useEffect(() => {
    let aktif = true;
    let permintaanTerakhir = 0;
    const muat = () => {
      const nomor = ++permintaanTerakhir;
      return apiFetch("/api/butir/history-terakhir")
        .then((hasil) => {
          if (aktif && nomor === permintaanTerakhir) setData(hasil || null);
        })
        .catch(() => {});
    };
    const muatSaatTabAktif = () => {
      if (document.visibilityState === "visible") muat();
    };

    muat();
    window.addEventListener("generation_status_changed", muat);
    window.addEventListener("focus", muatSaatTabAktif);
    document.addEventListener("visibilitychange", muatSaatTabAktif);
    return () => {
      aktif = false;
      window.removeEventListener("generation_status_changed", muat);
      window.removeEventListener("focus", muatSaatTabAktif);
      document.removeEventListener("visibilitychange", muatSaatTabAktif);
    };
  }, [pathname]);

  return (
    <section
      aria-label="History debat terakhir"
      className="mx-3 mt-2 mb-4 border border-[var(--line)] rounded-md bg-[var(--surface)] overflow-hidden"
    >
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--line)] bg-[var(--canvas)]">
        <div className="flex items-center gap-1.5">
          <History
            size={14}
            strokeWidth={1.75}
            className="text-[var(--accent)]"
            aria-hidden="true"
          />
          <h2 className="font-serif text-[13px] font-medium text-[var(--ink)]">
            History
          </h2>
        </div>
        <span className="font-mono text-[10px] text-[var(--ink-muted)]">
          debat terakhir
        </span>
      </header>

      {!data ? (
        <p className="px-3 py-3.5 font-serif text-xs leading-relaxed text-[var(--ink-muted)]">
          Belum ada riwayat debat. Ringkasan generasi yang telah selesai akan tampil di sini.
        </p>
      ) : (
        <>
          <div className="px-3 pt-2.5 pb-2 space-y-2">
            <div>
              <p className="font-serif text-xs leading-snug text-[var(--ink)] line-clamp-2">
                {data.label}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-[var(--ink-muted)] tabular-nums">
                {formatWaktu(data.selesai)} · {data.total} butir
              </p>
            </div>

            <RingkasanStatus hitung={data.hitung} total={data.total} />
          </div>

          <ul className="border-t border-[var(--line)] divide-y divide-[var(--line)]">
            {data.items.map((item, i) => (
              <li key={item.id} className="px-3 py-2 flex gap-2">
                <span className="mt-0.5 h-fit shrink-0 border border-[var(--line)] bg-[var(--canvas)] px-1 font-mono text-[10px] font-semibold leading-4 text-[var(--accent)]">
                  {item.level_bloom}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-serif text-[11px] leading-snug text-[var(--ink)] line-clamp-2 break-words">
                    <MathText text={item.pertanyaan || `Butir ${i + 1}`} gulir={false} />
                  </p>
                  <div className="flex items-center justify-between gap-2 font-sans text-[10px]">
                    <span
                      className="inline-flex items-center gap-1 min-w-0"
                      style={{ color: warnaStatus(item.status) }}
                    >
                      <Kotak
                        warna={warnaPenanda(item.status)}
                        kosong={item.status === "tertunda"}
                        className="!w-1.5 !h-1.5"
                      />
                      <span className="truncate">
                        {STATUS_HISTORY.find((s) => s.key === item.status)?.label ?? item.status}
                      </span>
                    </span>
                    <PipRonde ronde={item.ronde_saat_ini} />
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <Link
            href="/history"
            className="flex items-center justify-between gap-2 border-t border-[var(--line)] bg-[var(--canvas)] px-3 py-2 font-sans text-[11px] font-medium text-[var(--accent)] transition-colors duration-[140ms] hover:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset"
          >
            <span>Lihat semua soal ({data.total})</span>
            <ArrowRight size={12} strokeWidth={2} aria-hidden="true" />
          </Link>
        </>
      )}
    </section>
  );
}
