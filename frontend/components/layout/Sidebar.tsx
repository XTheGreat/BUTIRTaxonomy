"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  Activity,
  Archive,
  ChevronDown,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Flag,
  Gauge,
  BookmarkCheck,
  History,
  Hourglass,
  Store,
  LayoutDashboard,
  Layers,
  PanelLeftClose,
  type LucideIcon,
} from "lucide-react";
import HistoryDebat from "@/components/layout/HistoryDebat";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  isMarkedCount?: boolean;
  isPendingCount?: boolean;
}

interface NavGroup {
  group?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    group: "Persiapan",
    items: [
      { href: "/materi", label: "Materi Ajar", icon: BookOpen },
      { href: "/kisi-kisi", label: "Kisi-kisi", icon: ClipboardList },
    ],
  },
  {
    group: "Telaah",
    items: [
      { href: "/butir-ditandai", label: "Butir Ditandai", icon: Flag, isMarkedCount: true },
      { href: "/butir-tertunda", label: "Butir Tertunda", icon: Hourglass, isPendingCount: true },
      { href: "/bank-soal", label: "Bank Soal", icon: Archive },
      { href: "/marketplace", label: "Marketplace", icon: Store },
    ],
  },
  {
    group: "Ujian",
    items: [
      { href: "/daftar-ujian", label: "Daftar Ujian", icon: CalendarCheck },
      { href: "/rakit-ujian", label: "Rakit Ujian", icon: Layers },
    ],
  },
  {
    group: "Sistem",
    items: [
      { href: "/paket", label: "Paket & Pemakaian", icon: Gauge },
      { href: "/log-llm", label: "Log LLM", icon: Activity },
    ],
  },
  {
    group: "Arsip",
    items: [
      { href: "/riwayat-diterima", label: "Riwayat Diterima", icon: History },
      { href: "/arsip", label: "Arsip Soal", icon: BookmarkCheck },
    ],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
}

export default function Sidebar({
  isOpen = true,
  onClose,
  onToggle,
}: SidebarProps) {
  const pathname = usePathname();
  const [markedCount, setMarkedCount] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [terbuka, setTerbuka] = useState<Record<string, boolean>>({});

  const grupAktif = navGroups.find((g) =>
    g.items.some((i) => i.href !== "/dashboard" && pathname.startsWith(i.href)),
  )?.group;

  useEffect(() => {
    if (grupAktif) setTerbuka((t) => (t[grupAktif] ? t : { ...t, [grupAktif]: true }));
  }, [grupAktif]);

  useEffect(() => {
    let isMounted = true;
    apiFetch("/api/butir?status=ditandai")
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setMarkedCount(data.length);
        }
      })
      .catch(() => {});
    apiFetch("/api/butir/tertunda")
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setPendingCount(data.filter((b) => b.status === "tertunda").length);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const navInner = (
    <div className="w-[240px] h-full flex flex-col border-r border-[var(--line)] bg-[var(--canvas)] select-none">
      <div className="shrink-0 px-5 py-4 border-b border-[var(--line)] bg-white flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="block focus-visible:outline-none group"
          aria-label="BUTIR — ke dashboard"
        >
          <Image
            src="/ButirLogoSidebar.png"
            width={532}
            height={107}
            unoptimized
            alt="BUTIR"
            className="h-auto w-[150px]"
          />
        </Link>
        <button
          onClick={onToggle || onClose}
          className="shrink-0 rounded p-1.5 text-[var(--ink-muted)] transition-colors duration-[140ms] hover:bg-[var(--line)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label="Tutup navigasi"
          title="Tutup bilah samping"
        >
          <PanelLeftClose size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--line-strong)_transparent]">
        <nav className="px-3 pb-3 pt-4 space-y-5" aria-label="Navigasi utama">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-0.5">
              {group.group && (
                <button
                  type="button"
                  onClick={() => setTerbuka((t) => ({ ...t, [group.group!]: !t[group.group!] }))}
                  aria-expanded={!!terbuka[group.group]}
                  className="flex w-full items-center justify-between rounded px-3 pb-1.5 pt-0.5 font-sans text-xs font-bold text-[var(--ink-muted)] transition-colors duration-[140ms] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  {group.group}
                  <ChevronDown
                    size={14}
                    strokeWidth={1.8}
                    aria-hidden="true"
                    className={`transition-transform duration-200 ${terbuka[group.group] ? "" : "-rotate-90"}`}
                  />
                </button>
              )}
              <div
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                  !group.group || terbuka[group.group] ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
              <div className="-m-0.5 min-h-0 space-y-0.5 overflow-hidden p-0.5" inert={!!group.group && !terbuka[group.group]}>
              {group.items.map((item) => {
                const active =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`group flex items-center gap-3 rounded px-3 py-2 font-serif text-[14.5px] transition-colors duration-[140ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                      active
                        ? "font-medium text-[var(--ink)]"
                        : "text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                    }`}
                  >
                    <Icon
                      size={17}
                      strokeWidth={1.6}
                      aria-hidden="true"
                      className={`shrink-0 transition-colors duration-[140ms] ${
                        active
                          ? "text-[var(--accent)]"
                          : "text-[var(--ink-muted)] group-hover:text-[var(--ink)]"
                      }`}
                    />
                    <span className="relative inline-flex min-w-0 flex-col items-start">
                      <span className="truncate">{item.label}</span>
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 h-[2px] origin-left bg-[var(--accent)] transition-all duration-300 ease-out ${
                          active
                            ? "w-full"
                            : "w-0 group-hover:w-full group-hover:opacity-30"
                        }`}
                      />
                    </span>

                    {item.isMarkedCount &&
                      markedCount !== null &&
                      markedCount > 0 && (
                        <span className="ml-auto shrink-0 rounded border border-[#8A5A00]/30 bg-[var(--canvas)] px-1.5 font-sans text-[11px] font-semibold tabular-nums text-[#8A5A00]">
                          {markedCount}
                        </span>
                      )}

                    {item.isPendingCount &&
                      pendingCount !== null &&
                      pendingCount > 0 && (
                        <span className="ml-auto shrink-0 rounded border border-dashed border-[var(--line-strong)] bg-[var(--canvas)] px-1.5 font-sans text-[11px] font-semibold tabular-nums text-[var(--ink-muted)]">
                          {pendingCount}
                        </span>
                      )}
                  </Link>
                );
              })}
              </div>
              </div>
            </div>
          ))}
        </nav>

        <HistoryDebat />
      </div>

      <div className="shrink-0 flex items-center justify-between border-t border-[var(--line)] px-4 py-3 font-mono text-[10px] tracking-wide text-[var(--ink-muted)]">
        <span>BUTIR</span>
        <span className="tabular-nums">v1.0</span>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden md:block sticky top-0 h-dvh shrink-0 transition-all duration-300 ease-in-out overflow-hidden z-30 ${
          isOpen
            ? "w-[240px] opacity-100"
            : "w-0 opacity-0 pointer-events-none"
        }`}
      >
        {navInner}
      </aside>

      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ease-in-out ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className={`fixed inset-0 bg-[var(--ink)]/40 transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          className={`fixed top-0 bottom-0 left-0 z-10 transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {navInner}
        </div>
      </div>
    </>
  );
}
