import React from "react";

export default function TigaTitik({ className = "" }: { className?: string }) {
  return (
    <span className={`tiga-titik inline-flex items-center gap-1.5 ${className}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}
