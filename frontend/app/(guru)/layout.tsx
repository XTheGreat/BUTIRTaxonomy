"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { useTeks } from "@/lib/teks";

export default function GuruLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const t = useTeks();
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const lebar = window.matchMedia("(max-width: 767px)");
    if (!lebar.matches) return;
    const asli = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = asli;
    };
  }, [sidebarOpen]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--canvas)] text-[var(--ink-muted)] text-sm font-serif">
        <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse mr-2" />
        {t.shell.layoutGuru.menyiapkan}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-[var(--canvas)] text-[var(--ink)]">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggle={() => setSidebarOpen((prev) => !prev)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-x-clip">
        <Topbar
          isSidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
