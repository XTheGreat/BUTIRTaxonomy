import React from "react";

export interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = "h-4 w-full" }: SkeletonProps) {
  return (
    <div
      className={`bg-[var(--line)]/60 rounded animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="border border-[var(--line)] bg-[var(--canvas)]">
      <div className="border-b border-[var(--line)] bg-[var(--surface)] px-3 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className={`h-3 ${i === 0 ? "w-8" : i === 1 ? "w-40" : "w-20"}`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, ri) => (
        <div
          key={ri}
          className="px-3 py-3 flex gap-4 border-b border-[var(--line)] last:border-b-0"
        >
          {Array.from({ length: cols }).map((_, ci) => (
            <Skeleton
              key={ci}
              className={`h-3.5 ${ci === 0 ? "w-8" : ci === 1 ? "w-48" : "w-16"}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 3 }: { count?: number }) {
  return (
    <div className="border border-[var(--line)] bg-[var(--surface)]">
      <div className={`grid grid-cols-1 sm:grid-cols-${count} divide-y sm:divide-y-0 sm:divide-x divide-[var(--line)]`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-6 space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-2.5 w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}
