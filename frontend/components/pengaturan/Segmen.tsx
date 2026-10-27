"use client";

import PenandaPanah from "@/components/pengaturan/PenandaPanah";

interface OpsiSegmen<T extends string> {
  nilai: T;
  label: string;
}

interface SegmenProps<T extends string> {
  label: string;
  nilai: T;
  opsi: OpsiSegmen<T>[];
  onUbah: (nilai: T) => void;
  className?: string;
}

// Pilihan satu-dari-beberapa menggunakan kepala panah sebagai penanda opsi.
export default function Segmen<T extends string>({ label, nilai, opsi, onUbah, className = "" }: SegmenProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`grid gap-2 ${opsi.length > 2 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"} ${className}`}
    >
      {opsi.map((o) => {
        const terpilih = o.nilai === nilai;
        return (
          <button
            key={o.nilai}
            type="button"
            role="radio"
            aria-checked={terpilih}
            onClick={() => onUbah(o.nilai)}
            className={`flex items-center gap-3 rounded border px-3.5 py-2.5 text-left text-sm transition-colors duration-[140ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] ${
              terpilih
                ? "border-[var(--line-strong)] bg-[var(--line)]/40 text-[var(--ink)]"
                : "border-[var(--line-strong)] bg-[var(--canvas)] text-[var(--ink-muted)] hover:bg-[var(--line)]/40 hover:text-[var(--ink)]"
            }`}
          >
            <span className="flex h-3 w-3 shrink-0 items-center justify-center">
              {terpilih && <PenandaPanah className="h-3 w-3 text-[var(--ink)]" />}
            </span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
