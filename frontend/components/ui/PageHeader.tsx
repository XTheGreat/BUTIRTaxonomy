import React from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  className?: string;
}

export default function PageHeader({
  title,
  description,
  action,
  breadcrumb,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`border-b border-[var(--line)] pb-5 mb-6 ${className}`}>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--ink-muted)]">
            {breadcrumb.map((item, idx) => (
              <li key={idx} className="flex items-center gap-1.5">
                {idx > 0 && <span className="text-[var(--line-strong)]">/</span>}
                {item.href ? (
                  <a
                    href={item.href}
                    className="hover:text-[var(--ink)] hover:underline transition-colors"
                  >
                    {item.label}
                  </a>
                ) : (
                  <span className="text-[var(--ink)] font-medium">{item.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-[28px] font-normal text-[var(--ink)] tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-[var(--ink-muted)] mt-1 max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
