"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FooterSitus from "@/components/layout/FooterSitus";
import { useTeks } from "@/lib/teks";
import { useJudulTab } from "@/lib/teks/judulTab";

export function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="border-b border-[var(--line)] pb-2 font-serif text-lg font-normal text-[var(--ink)]">{judul}</h2>
      <div className="mt-3 space-y-3 font-sans text-sm leading-relaxed text-[var(--ink)]">{children}</div>
    </section>
  );
}

export default function HalamanInfo({
  judul,
  ringkasan,
  children,
}: {
  judul: string;
  ringkasan?: string;
  children: React.ReactNode;
}) {
  const t = useTeks();
  useJudulTab(judul.includes("BUTIR") ? judul : `${judul} - BUTIR`);
  return (
    <div className="flex min-h-screen flex-col bg-[var(--canvas)] text-[var(--ink)]">
      <header className="bg-[var(--accent)] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5 lg:px-12">
          <Link href="/login" className="font-serif text-xl font-medium tracking-tight focus-visible:outline-none">
            BUTIR
          </Link>
          <Link
            href="/login"
            className="font-sans text-xs text-white/85 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none"
          >
            {t.info.halaman.masuk}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 font-sans text-xs text-[var(--ink-muted)] transition-colors duration-[140ms] hover:text-[var(--accent)]"
        >
          <ArrowLeft size={14} strokeWidth={1.8} aria-hidden="true" />
          {t.info.halaman.kembaliKeMasuk}
        </Link>
        <h1 className="mt-4 font-serif text-3xl font-normal tracking-tight">{judul}</h1>
        {ringkasan && <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-[var(--ink-muted)]">{ringkasan}</p>}
        <div className="mt-8 space-y-8">{children}</div>
      </main>

      <FooterSitus />
    </div>
  );
}
