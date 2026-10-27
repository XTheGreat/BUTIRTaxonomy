"use client";

import { BagianKepala } from "@/components/pengaturan/BagianKepala";
import FormPreferensi from "@/components/pengaturan/FormPreferensi";
import { useTeks } from "@/lib/teks";

export default function Preferensi() {
  const t = useTeks().akun.pengaturan.preferensi;
  return (
    <div className="[&>form]:mt-4 [&>form]:border-t-0">
      <BagianKepala judul={t.judul} keterangan={t.keterangan} />
      <FormPreferensi />
    </div>
  );
}
