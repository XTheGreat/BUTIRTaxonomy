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
    "inline-flex items-center justify-center font-medium rounded transition-colors duration-140 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed select-none";

  const variants = {
    primary:
      "bg-[var(--accent)] text-white hover:bg-[#0c4d53] active:bg-[#093d42] border border-[var(--accent)]",
    secondary:
      "bg-[var(--surface)] text-[var(--ink)] hover:bg-white hover:border-[var(--ink)] active:bg-[var(--surface)] border border-[var(--line-strong)]",
    ghost:
      "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)] border border-transparent",
    danger:
      "bg-transparent text-[#A4262C] hover:bg-[#FBEAEA]/60 active:bg-[#F2C2C5]/80 border border-[#A4262C]/40",
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
