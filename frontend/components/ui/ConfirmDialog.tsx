"use client";

import { useEffect, useRef } from "react";
import { useTeks } from "@/lib/teks";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel,
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const t = useTeks().komponen.konfirmasi;
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const isDestructive = variant === "destructive";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-[var(--ink)]/40"
        onClick={onCancel}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative z-10 w-full max-w-md mx-4 max-h-[90dvh] overflow-y-auto bg-[var(--canvas)] border border-[var(--line)] rounded-md p-6"
        style={{ boxShadow: "var(--shadow-overlay)" }}
      >
        <h2
          id="confirm-title"
          className="font-serif text-lg font-normal text-[var(--ink)] mb-1"
        >
          {title}
        </h2>

        {description && (
          <p className="text-sm text-[var(--ink-muted)] leading-relaxed mb-4">
            {description}
          </p>
        )}

        {children && <div className="mb-4">{children}</div>}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--line)]">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--line)] rounded bg-[var(--canvas)] transition-colors duration-[140ms] ease-out focus-visible:outline-none disabled:opacity-50"
          >
            {cancelLabel ?? t.batal}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded transition-colors duration-[140ms] ease-out focus-visible:outline-none disabled:opacity-50 ${
              isDestructive
                ? "bg-[#A4262C] text-white hover:bg-[#8C2025] border border-[#A4262C]"
                : "bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 border border-[var(--accent)]"
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
                {t.memproses}
              </span>
            ) : (
              (confirmLabel ?? t.konfirmasi)
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
