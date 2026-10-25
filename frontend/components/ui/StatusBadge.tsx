import React from "react";

export interface StatusBadgeProps {
  status: string;
  className?: string;
}

interface StatusConfig {
  label: string;
  text: string;
}

const statusConfigs: Record<string, StatusConfig> = {
  diterima: {
    label: "Diterima",
    text: "text-[#1F6B3A]",
  },
  ditandai: {
    label: "Ditandai",
    text: "text-[#8A5A00]",
  },
  ditolak: {
    label: "Ditolak",
    text: "text-[#A4262C]",
  },
  debating: {
    label: "Debating",
    text: "text-[var(--accent)]",
  },
  tertunda: {
    label: "Tertunda",
    text: "text-[var(--ink-muted)]",
  },
  draft: {
    label: "Draft",
    text: "text-[var(--ink-muted)]",
  },
  aktif: {
    label: "Aktif",
    text: "text-[#1F6B3A]",
  },
  selesai: {
    label: "Selesai",
    text: "text-[var(--ink-muted)]",
  },
};

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const normKey = (status || "").toLowerCase();
  const config = statusConfigs[normKey] || {
    label: status,
    text: "text-[var(--ink-muted)]",
  };

  return (
    <span
      className={`inline-flex items-center text-xs font-semibold ${config.text} ${className}`}
    >
      <span>{config.label}</span>
    </span>
  );
}
