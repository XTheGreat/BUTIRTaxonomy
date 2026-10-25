import React from "react";
import { PackageOpen, LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon | React.ReactNode;
  className?: string;
}

export default function EmptyState({
  title,
  description,
  action,
  icon,
  className = "",
}: EmptyStateProps) {
  const hasCustomPy = className.includes("py-");
  const hasCustomMinH = className.includes("min-h-");
  const hasCustomBorder = className.includes("border-");

  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }
    const IconComponent = (icon as LucideIcon) || PackageOpen;
    return (
      <IconComponent
        size={48}
        strokeWidth={1.25}
        className="text-[var(--ink-muted)]/65 mb-3.5 select-none"
      />
    );
  };

  return (
    <div
      className={`${
        hasCustomBorder
          ? ""
          : "border border-dashed border-[var(--line-strong)]/40 bg-[var(--surface)]/40"
      } px-6 ${
        hasCustomPy ? "" : "py-14 sm:py-16"
      } ${
        hasCustomMinH ? "" : "min-h-[220px] sm:min-h-[250px]"
      } flex flex-col justify-center items-center text-center rounded-lg ${className}`}
    >
      {renderIcon()}

      <h3 className="text-base font-bold text-[var(--ink)] mb-1.5 tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-[var(--ink-muted)] max-w-md mx-auto mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
