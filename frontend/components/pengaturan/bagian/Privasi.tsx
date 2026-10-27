"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { BagianKepala, Subjudul } from "@/components/pengaturan/BagianKepala";
import { getToken } from "@/lib/auth";
import { KUNCI_PREFERENSI, hapusPreferensi } from "@/lib/preferensi";
import { KUNCI_BAHASA } from "@/lib/teks/aktif";
import { useTeks } from "@/lib/teks";
import { KUNCI_TAMPILAN, hapusTampilan } from "@/lib/tampilan";

function ada(kunci: string): boolean {
  try {
    return localStorage.getItem(kunci) !== null;
  } catch {
    return false;
  }
}

function bacaStatus() {
  return {
    sesi: !!getToken(),
    bahasa: ada(KUNCI_BAHASA),
    preferensi: ada(KUNCI_PREFERENSI),
    tampilan: ada(KUNCI_TAMPILAN),
  };
}

export default function Privasi() {
  const t = useTeks().akun.pengaturan.privasi;
  const [status, setStatus] = useState(bacaStatus);
  const [pesan, setPesan] = useState("");

  function hapus() {
    hapusPreferensi();
    hapusTampilan();
    setStatus(bacaStatus());
    setPesan(t.dihapus);
  }

  const baris: { kunci: keyof typeof status; label: string }[] = [
    { kunci: "sesi", label: t.item.sesi },
    { kunci: "bahasa", label: t.item.bahasa },
    { kunci: "preferensi", label: t.item.preferensi },
    { kunci: "tampilan", label: t.item.tampilan },
  ];

  const tautan = "text-sm text-[var(--accent)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]";

  return (
    <div className="space-y-8">
      <BagianKepala judul={t.judul} keterangan={t.keterangan} />

      <section aria-labelledby="privasi-lokal" className="space-y-2">
        <Subjudul id="privasi-lokal">{t.dataLokal}</Subjudul>
        <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {baris.map(({ kunci, label }) => (
            <li key={kunci} className="flex items-center justify-between gap-4 py-2.5 text-sm">
              <span className="text-[var(--ink)]">{label}</span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-[var(--ink-muted)]">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${
                    status[kunci] ? "bg-[var(--accent)]" : "border border-[var(--line-strong)]"
                  }`}
                />
                {status[kunci] ? t.tersimpan : t.tidakAda}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button type="button" variant="danger" onClick={hapus}>
            {t.hapus}
          </Button>
          {pesan && (
            <p role="status" className="text-sm text-[#1F6B3A]">
              {pesan}
            </p>
          )}
        </div>
        <p className="text-xs text-[var(--ink-muted)]">{t.catatanHapus}</p>
      </section>

      <section aria-labelledby="privasi-dokumen" className="space-y-2">
        <Subjudul id="privasi-dokumen">{t.dokumen}</Subjudul>
        <ul className="space-y-1.5">
          <li>
            <a href="/privasi" target="_blank" rel="noopener noreferrer" className={tautan}>
              {t.kebijakanPrivasi}
            </a>
          </li>
          <li>
            <a href="/syarat" target="_blank" rel="noopener noreferrer" className={tautan}>
              {t.syarat}
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
