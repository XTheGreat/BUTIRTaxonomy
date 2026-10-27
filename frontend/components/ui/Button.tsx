import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-medium rounded transition-colors duration-140 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed select-none";

  const variants = {
    primary:
      "bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] hover:bg-[var(--button-primary-hover)] active:bg-[var(--button-primary-active)] border border-[var(--button-primary-border)]",
    secondary:
      "bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--canvas)] hover:border-[var(--ink)] active:bg-[var(--surface)] border border-[var(--line-strong)]",
    ghost:
      "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)] border border-transparent",
    danger:
      "bg-transparent text-[var(--status-ditolak)] hover:bg-[var(--status-ditolak-bg)]/60 active:bg-[var(--status-ditolak-bg)] border border-[var(--status-ditolak)]/40",
  };

  const sizes = {
    sm: "px-2.5 py-1 text-xs gap-1.5",
    md: "px-3.5 py-1.5 text-sm gap-2",
    lg: "px-5 py-2.5 text-base gap-2.5",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
