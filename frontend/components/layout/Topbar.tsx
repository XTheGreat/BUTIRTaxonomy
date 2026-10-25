"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCurrentUser, logout } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { PanelLeftOpen } from "lucide-react";
import { useEffect, useState } from "react";

const routeNameMap: Record<string, string> = {
  dashboard: "Dashboard",
  materi: "Materi Ajar",
  "kisi-kisi": "Kisi-kisi",
  "butir-ditandai": "Butir Ditandai",
  "butir-tertunda": "Butir Tertunda",
  history: "History Debat",
  "log-llm": "Log LLM",
  paket: "Paket & Pemakaian",
  marketplace: "Marketplace",
  debat: "Debat Live",
  "bank-soal": "Bank Soal",
  arsip: "Arsip Soal",
  "riwayat-diterima": "Riwayat Diterima",
  "daftar-ujian": "Daftar Ujian",
  "rakit-ujian": "Rakit Ujian",
  generasi: "Generasi Soal",
  ujian: "Detail Ujian",
  laporan: "Laporan Ujian",
};

interface TopbarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  onOpenMobileMenu?: () => void;
}

export default function Topbar({
  onToggleSidebar,
  isSidebarOpen = true,
  onOpenMobileMenu,
}: TopbarProps) {
  const pathname = usePathname();
  const user = getCurrentUser();
  const [activeGenId, setActiveGenId] = useState<string | null>(null);

  useEffect(() => {
    const updateActiveGen = () => {
      try {
        const raw = localStorage.getItem("butir_active_generation");
        if (raw) {
          const parsed = JSON.parse(raw);
          setActiveGenId(parsed.id || null);
        } else {
          setActiveGenId(null);
        }
      } catch {
        setActiveGenId(null);
      }
    };

    updateActiveGen();
    window.addEventListener("generation_status_changed", updateActiveGen);
    window.addEventListener("storage", updateActiveGen);
    return () => {
      window.removeEventListener("generation_status_changed", updateActiveGen);
      window.removeEventListener("storage", updateActiveGen);
    };
  }, []);

  useEffect(() => {
    if (!activeGenId) return;
    let dibatalkan = false;
    const cekMasihBerjalan = async () => {
      try {
        const data = await apiFetch(`/api/kisi-kisi/${activeGenId}/status`);
        if (dibatalkan || !data || !data.total) return;
        const berjalan = data.items.some(
          (item: { status: string }) =>
            item.status === "draft" || item.status === "debating"
        );
        if (!berjalan) {
          localStorage.removeItem("butir_active_generation");
          setActiveGenId(null);
          window.dispatchEvent(new Event("generation_status_changed"));
        }
      } catch {}
    };
    cekMasihBerjalan();
    const interval = setInterval(cekMasihBerjalan, 5000);
    return () => {
      dibatalkan = true;
      clearInterval(interval);
    };
  }, [activeGenId]);

  const handleToggle = onToggleSidebar || onOpenMobileMenu;

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbItems = segments.map((seg, idx) => {
    const isId = seg.length > 20 || !isNaN(Number(seg));
    const label = isId ? `#${seg.slice(0, 6)}...` : routeNameMap[seg] || seg;
    const href = "/" + segments.slice(0, idx + 1).join("/");
    const isLast = idx === segments.length - 1;
    return { label, href, isLast };
  });

  return (
    <header className="h-12 bg-[var(--canvas)] flex items-center justify-between px-4 sm:px-6 shrink-0 select-none sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        {handleToggle && !isSidebarOpen && (
          <button
            onClick={handleToggle}
            className="p-1.5 -ml-1 text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]/40 rounded transition-colors focus-visible:outline-none"
            aria-label="Buka bilah samping"
            title="Buka bilah samping"
          >
            <PanelLeftOpen size={18} strokeWidth={1.5} />
          </button>
        )}

        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)] truncate"
        >
          <span className="text-[var(--ink-muted)] hidden sm:inline">Pengajar</span>
          {breadcrumbItems.map((item, idx) => (
            <span key={idx} className="flex items-center gap-1.5 truncate">
              <span className="text-[var(--line-strong)]">/</span>
              <span
                className={`truncate ${
                  item.isLast
                    ? "text-[var(--ink)] font-medium"
                    : "text-[var(--ink-muted)]"
                }`}
              >
                {item.label}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-4">
        {activeGenId && !pathname.includes(activeGenId) && (
          <Link
            href={`/generasi/${activeGenId}`}
            className="flex items-center gap-2 px-2.5 py-1 text-xs border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors select-none font-medium"
            title="Klik untuk kembali ke progres debat multi-agen yang sedang berlangsung"
          >
            <span>Debat Berlangsung</span>
          </Link>
        )}

        <div className="flex items-center gap-2.5 hidden sm:flex">
          <div className="text-right">
            <span className="text-xs font-medium text-[var(--ink)] block truncate max-w-[140px]">
              {user?.nama || "Pengajar"}
            </span>
            <span className="text-[11px] text-[var(--ink-muted)] block truncate max-w-[140px]">
              {user?.email || "email@instansi.id"}
            </span>
          </div>
          <div
            className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center shrink-0"
            title={user?.nama || "Pengajar"}
          >
            <span className="text-[11px] font-sans font-semibold text-white leading-none select-none">
              {(() => {
                const nama = user?.nama || "GP";
                const parts = nama.trim().split(/\s+/);
                if (parts.length >= 2) {
                  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                }
                return nama.slice(0, 2).toUpperCase();
              })()}
            </span>
          </div>
        </div>
        <div className="h-4 w-px bg-[var(--line)] hidden sm:block" />
        <button
          onClick={logout}
          className="text-xs text-[var(--ink-muted)] hover:text-[#A4262C] transition-colors duration-[140ms] py-1 focus-visible:outline-none"
        >
          Keluar
        </button>
      </div>
    </header>
  );
}
