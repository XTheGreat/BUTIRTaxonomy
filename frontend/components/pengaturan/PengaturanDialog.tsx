"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { DAFTAR_BAGIAN } from "@/components/pengaturan/bagian";
import { useTeks } from "@/lib/teks";

interface PengaturanDialogProps {
  bagianAktif: string;
  onPilih: (id: string) => void;
  onTutup: () => void;
}

const FOKUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function PengaturanDialog({ bagianAktif, onPilih, onTutup }: PengaturanDialogProps) {
  const t = useTeks();
  const d = t.akun.pengaturan.dialog;
  const panel = useRef<HTMLDivElement>(null);
  const daftarTab = useRef<HTMLDivElement>(null);

  // Kunci gulir halaman, kembalikan fokus ke pemicu saat ditutup, dan simpan fokus di dalam dialog.
  useEffect(() => {
    const pemicu = document.activeElement as HTMLElement | null;
    const gulirAsli = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.body.style.overflow = gulirAsli;
      pemicu?.focus?.();
    };
  }, []);

  useEffect(() => {
    const tangani = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onTutup();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const dapat = Array.from(panel.current.querySelectorAll<HTMLElement>(FOKUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (dapat.length === 0) return;
      const pertama = dapat[0];
      const terakhir = dapat[dapat.length - 1];
      if (e.shiftKey && document.activeElement === pertama) {
        e.preventDefault();
        terakhir.focus();
      } else if (!e.shiftKey && document.activeElement === terakhir) {
        e.preventDefault();
        pertama.focus();
      }
    };
    document.addEventListener("keydown", tangani);
    return () => document.removeEventListener("keydown", tangani);
  }, [onTutup]);

  function tanganiPanah(e: React.KeyboardEvent) {
    const maju = e.key === "ArrowDown" || e.key === "ArrowRight";
    const mundur = e.key === "ArrowUp" || e.key === "ArrowLeft";
    if (!maju && !mundur) return;
    e.preventDefault();
    const indeks = DAFTAR_BAGIAN.findIndex((b) => b.id === bagianAktif);
    const berikut = DAFTAR_BAGIAN[(indeks + (maju ? 1 : -1) + DAFTAR_BAGIAN.length) % DAFTAR_BAGIAN.length];
    onPilih(berikut.id);
    daftarTab.current?.querySelector<HTMLElement>(`[data-bagian="${berikut.id}"]`)?.focus();
  }

  const aktif = DAFTAR_BAGIAN.find((b) => b.id === bagianAktif) ?? DAFTAR_BAGIAN[0];
  const Isi = aktif.Komponen;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-[var(--ink)]/40" onClick={onTutup} aria-hidden="true" />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pengaturan-judul"
        tabIndex={-1}
        className="relative z-10 flex h-dvh w-full flex-col bg-[var(--canvas)] focus:outline-none md:h-[min(680px,90dvh)] md:max-w-4xl md:rounded-md md:border md:border-[var(--line)]"
        style={{ boxShadow: "var(--shadow-overlay)" }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--line)] px-5 py-3">
          <h2 id="pengaturan-judul" className="font-serif text-lg font-normal text-[var(--ink)]">
            {d.judul}
          </h2>
          <button
            type="button"
            onClick={onTutup}
            aria-label={d.tutup}
            title={d.tutup}
            className="rounded p-1.5 text-[var(--ink-muted)] transition-colors duration-[140ms] hover:bg-[var(--surface)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <X size={18} strokeWidth={1.6} aria-hidden="true" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div
            ref={daftarTab}
            role="tablist"
            aria-label={d.navigasi}
            aria-orientation="vertical"
            onKeyDown={tanganiPanah}
            className="flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--line)] bg-[var(--surface)] p-2 md:w-56 md:flex-col md:overflow-x-visible md:overflow-y-auto md:border-b-0 md:border-r"
          >
            {DAFTAR_BAGIAN.map((b) => {
              const terpilih = b.id === aktif.id;
              const Ikon = b.ikon;
              return (
                <button
                  key={b.id}
                  type="button"
                  role="tab"
                  id={`tab-pengaturan-${b.id}`}
                  data-bagian={b.id}
                  aria-selected={terpilih}
                  aria-controls="panel-pengaturan"
                  tabIndex={terpilih ? 0 : -1}
                  onClick={() => onPilih(b.id)}
                  className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded px-3 py-2 text-left text-sm transition-colors duration-[140ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                    terpilih
                      ? "bg-[var(--accent-soft)] font-medium text-[var(--ink)]"
                      : "text-[var(--ink-muted)] hover:bg-[var(--line)]/40 hover:text-[var(--ink)]"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 shrink-0 rounded-full ${terpilih ? "bg-[var(--accent)]" : "bg-transparent"}`}
                  />
                  <Ikon
                    size={16}
                    strokeWidth={1.6}
                    aria-hidden="true"
                    className={`shrink-0 ${terpilih ? "text-[var(--accent)]" : ""}`}
                  />
                  {b.label(t)}
                </button>
              );
            })}
          </div>

          <div
            id="panel-pengaturan"
            role="tabpanel"
            aria-labelledby={`tab-pengaturan-${aktif.id}`}
            className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8"
          >
            <div className="mx-auto max-w-2xl">
              <Isi key={aktif.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
