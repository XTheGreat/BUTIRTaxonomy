"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { BagianKepala, Subjudul } from "@/components/pengaturan/BagianKepala";
import { useTeks } from "@/lib/teks";
import {
  TAMPILAN_BAWAAN,
  bacaTampilan,
  hapusTampilan,
  simpanTampilan,
  type Tampilan as NilaiTampilan,
  type UkuranTeks,
} from "@/lib/tampilan";

interface SwitchTampilanProps {
  label: string;
  aktif: boolean;
  labelAktif: string;
  labelNonaktif: string;
  onUbah: (aktif: boolean) => void;
}

function SwitchTampilan({ label, aktif, labelAktif, labelNonaktif, onUbah }: SwitchTampilanProps) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={aktif}
        onClick={() => onUbah(!aktif)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded border p-[3px] transition-colors duration-[140ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] ${
          aktif
            ? "border-[var(--accent)] bg-[var(--accent)]"
            : "border-[var(--line-strong)] bg-[var(--line)]"
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute left-[3px] top-[3px] h-5 w-5 rounded border border-[var(--line-strong)] bg-[var(--canvas)] transition-transform duration-[140ms] ease-out ${
            aktif ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <span className="text-sm text-[var(--ink)]" aria-live="polite">
        {aktif ? labelAktif : labelNonaktif}
      </span>
    </div>
  );
}

export default function Tampilan() {
  const t = useTeks().akun.pengaturan.tampilan;
  const [nilai, setNilai] = useState<NilaiTampilan>(bacaTampilan);

  function ubah(bagian: Partial<NilaiTampilan>) {
    const baru = { ...nilai, ...bagian };
    setNilai(baru);
    simpanTampilan(baru);
  }

  function kembalikan() {
    hapusTampilan();
    setNilai({ ...TAMPILAN_BAWAAN });
  }

  return (
    <div className="space-y-8">
      <BagianKepala judul={t.judul} keterangan={t.keterangan} />

      <section aria-labelledby="tampilan-tema" className="space-y-2">
        <Subjudul id="tampilan-tema">{t.tema.judul}</Subjudul>
        <p className="text-sm text-[var(--ink-muted)]">{t.tema.keterangan}</p>
        <SwitchTampilan
          label={t.tema.judul}
          aktif={nilai.tema === "gelap"}
          labelAktif={t.tema.gelap}
          labelNonaktif={t.tema.terang}
          onUbah={(aktif) => ubah({ tema: aktif ? "gelap" : "terang" })}
        />
      </section>

      <section aria-labelledby="tampilan-ukuran" className="space-y-2">
        <Subjudul id="tampilan-ukuran">{t.ukuranTeks.judul}</Subjudul>
        <p className="text-sm text-[var(--ink-muted)]">{t.ukuranTeks.keterangan}</p>
        <select
          id="tampilan-ukuran-pilihan"
          aria-labelledby="tampilan-ukuran"
          value={nilai.ukuranTeks}
          onChange={(event) => ubah({ ukuranTeks: event.target.value as UkuranTeks })}
          className="w-full max-w-sm rounded border border-[var(--line-strong)] bg-[var(--canvas)] px-3 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent-text)]"
        >
          <option value="kecil">{t.ukuranTeks.kecil}</option>
          <option value="normal">{t.ukuranTeks.normal}</option>
          <option value="besar">{t.ukuranTeks.besar}</option>
        </select>
      </section>

      <section aria-labelledby="tampilan-gerak" className="space-y-2">
        <Subjudul id="tampilan-gerak">{t.kurangiGerak.judul}</Subjudul>
        <p className="text-sm text-[var(--ink-muted)]">{t.kurangiGerak.keterangan}</p>
        <SwitchTampilan
          label={t.kurangiGerak.judul}
          aktif={nilai.kurangiGerak}
          labelAktif={t.aktif}
          labelNonaktif={t.nonaktif}
          onUbah={(kurangiGerak) => ubah({ kurangiGerak })}
        />
      </section>

      <section aria-labelledby="tampilan-kursor" className="space-y-2">
        <Subjudul id="tampilan-kursor">{t.kursor.judul}</Subjudul>
        <p className="text-sm text-[var(--ink-muted)]">{t.kursor.keterangan}</p>
        <SwitchTampilan
          label={t.kursor.judul}
          aktif={nilai.kursorKhusus}
          labelAktif={t.aktif}
          labelNonaktif={t.nonaktif}
          onUbah={(kursorKhusus) => ubah({ kursorKhusus })}
        />
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
        <Button
          type="button"
          variant="ghost"
          className="!text-[var(--accent-text)] underline underline-offset-4 decoration-[var(--accent-text)]"
          onClick={kembalikan}
        >
          {t.kembalikan}
        </Button>
        <p className="text-xs text-[var(--ink-muted)]">{t.catatan}</p>
      </div>
    </div>
  );
}
