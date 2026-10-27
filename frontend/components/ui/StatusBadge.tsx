"use client";

import React from "react";
import { useTeks } from "@/lib/teks";

export interface StatusBadgeProps {
  status: string;
  className?: string;
}

interface StatusConfig {
  text: string;
}

const statusConfigs: Record<string, StatusConfig> = {
  diterima: {

    text: "text-[var(--status-diterima)]",
  },
  ditandai: {

    text: "text-[var(--status-ditandai)]",
  },
  ditolak: {

    text: "text-[var(--status-ditolak)]",
  },
  debating: {

    text: "text-[var(--accent-text)]",
  },
  tertunda: {

    text: "text-[var(--ink-muted)]",
  },
  draft: {

    text: "text-[var(--ink-muted)]",
  },
  aktif: {

    text: "text-[var(--status-diterima)]",
  },
  selesai: {

    text: "text-[var(--ink-muted)]",
  },
};

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const labelStatus = useTeks().komponen.status;
  const normKey = (status || "").toLowerCase();
  const config = statusConfigs[normKey] || { text: "text-[var(--ink-muted)]" };
  const label = statusConfigs[normKey] ? labelStatus[normKey] ?? status : status;

  return (
    <span
      className={`inline-flex items-center text-xs font-semibold ${config.text} ${className}`}
    >
      <span>{label}</span>
    </span>
  );
}
