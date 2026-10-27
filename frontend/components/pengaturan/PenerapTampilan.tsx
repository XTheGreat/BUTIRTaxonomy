"use client";

import { useEffect } from "react";
import { bacaTampilan, terapkanTampilan } from "@/lib/tampilan";

// Menerapkan pengaturan tampilan tersimpan segera setelah aplikasi dimuat.
export default function PenerapTampilan() {
  useEffect(() => {
    terapkanTampilan(bacaTampilan());
  }, []);
  return null;
}
