"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronUp, LogOut, Settings } from "lucide-react";
import { getCurrentUser, logout } from "@/lib/auth";
import { useTeks } from "@/lib/teks";

export function inisialNama(nama: string): string {
  const bagian = nama.trim().split(/\s+/);
  if (bagian.length >= 2) {
    return (bagian[0][0] + bagian[bagian.length - 1][0]).toUpperCase();
  }
  return nama.slice(0, 2).toUpperCase();
}

interface ProfilMenuProps {
  onNavigate?: () => void;
}

export default function ProfilMenu({ onNavigate }: ProfilMenuProps) {
  const t = useTeks();
  const [terbuka, setTerbuka] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const wadah = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const muat = () => setUser(getCurrentUser());
    muat();
    // Dipancarkan Pengaturan setelah nama atau email berubah.
    window.addEventListener("user_diperbarui", muat);
    return () => window.removeEventListener("user_diperbarui", muat);
  }, []);

  useEffect(() => {
    if (!terbuka) return;
    const tutupBilaDiLuar = (e: MouseEvent) => {
      if (wadah.current && !wadah.current.contains(e.target as Node)) {
        setTerbuka(false);
      }
    };
    const tutupBilaEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTerbuka(false);
    };
    document.addEventListener("mousedown", tutupBilaDiLuar);
    document.addEventListener("keydown", tutupBilaEsc);
    return () => {
      document.removeEventListener("mousedown", tutupBilaDiLuar);
      document.removeEventListener("keydown", tutupBilaEsc);
    };
  }, [terbuka]);

  const nama = user?.nama || t.akun.profil.pengajarDefault;
  const email = user?.email || t.akun.profil.emailDefault;

  const itemKelas =
    "flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition-colors duration-[140ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]";

  return (
    <div ref={wadah} className="relative shrink-0 border-t border-[var(--line)] p-2">
      {terbuka && (
        <div
          role="menu"
          className="absolute inset-x-2 bottom-full mb-1 rounded-md border border-[var(--line)] bg-[var(--canvas)] p-1"
          style={{ boxShadow: "var(--shadow-overlay)" }}
        >
          <Link
            href="/pengaturan"
            role="menuitem"
            onClick={() => {
              setTerbuka(false);
              onNavigate?.();
            }}
            className={`${itemKelas} text-[var(--ink)] hover:bg-[var(--surface)]`}
          >
            <Settings size={16} strokeWidth={1.6} aria-hidden="true" className="shrink-0 text-[var(--ink-muted)]" />
            {t.akun.profil.pengaturan}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className={`${itemKelas} text-[#A4262C] hover:bg-[#FBEAEA]/60`}
          >
            <LogOut size={16} strokeWidth={1.6} aria-hidden="true" className="shrink-0" />
            {t.akun.profil.keluar}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setTerbuka((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={terbuka}
        aria-label={t.akun.profil.menu}
        className="flex w-full items-center gap-3 rounded px-2 py-2 text-left transition-colors duration-[140ms] hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[var(--line)] bg-[var(--surface)] font-mono text-[11px] font-medium text-[var(--ink)]"
        >
          {inisialNama(nama)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-[var(--ink)]">{nama}</span>
          <span className="block truncate text-xs text-[var(--ink-muted)]">{email}</span>
        </span>
        <ChevronUp
          size={14}
          strokeWidth={1.8}
          aria-hidden="true"
          className={`shrink-0 text-[var(--ink-muted)] transition-transform duration-200 ${terbuka ? "" : "rotate-180"}`}
        />
      </button>
    </div>
  );
}
