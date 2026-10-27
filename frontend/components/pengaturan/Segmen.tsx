"use client";

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

// Pilihan satu-dari-beberapa. Penanda terpilih memakai titik "Butir", bukan sakelar berbentuk pil.
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
            className={`flex items-center gap-3 rounded border px-3.5 py-2.5 text-left text-sm transition-colors duration-[140ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
              terpilih
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]"
                : "border-[var(--line-strong)] bg-[var(--canvas)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-2 w-2 shrink-0 rounded-full ${
                terpilih ? "bg-[var(--accent)]" : "border border-[var(--line-strong)]"
              }`}
            />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
