"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import TigaTitik from "@/components/ui/TigaTitik";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn()) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <div
      role="status"
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--canvas)] text-[var(--ink-muted)] text-sm font-serif"
    >
      <TigaTitik />
      <span>Memuat naskah BUTIR...</span>
    </div>
  );
}
