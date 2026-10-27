"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePengaturan } from "@/components/pengaturan/PengaturanProvider";

// Pengaturan kini berupa dialog. Alamat lama /pengaturan tetap berfungsi: membuka dialog
// lalu mengarahkan ke dashboard sebagai latar halamannya.
export default function PengaturanPage() {
  const router = useRouter();
  const { buka } = usePengaturan();

  useEffect(() => {
    buka();
    router.replace("/dashboard");
  }, [buka, router]);

  return null;
}
