"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useTeks } from "@/lib/teks";
import {
  BATAS,
  LEVEL_BLOOM,
  PREFERENSI_BAWAAN,
  bacaPreferensi,
  hapusPreferensi,
  simpanPreferensi,
  totalBloom,
} from "@/lib/preferensi";

export default function FormPreferensi() {
  const t = useTeks();
  const p = t.akun.pengaturan.preferensi;
  const namaBloom = t.persiapan.kisiKisi.bloom;

  const [awal] = useState(bacaPreferensi);
  const [jumlahButir, setJumlahButir] = useState(String(awal.jumlahButir));
  const [durasi, setDurasi] = useState(String(awal.durasiMenit));
  const [bloom, setBloom] = useState<Record<string, string>>(
    Object.fromEntries(LEVEL_BLOOM.map((l) => [l, String(awal.distribusiBloom[l])]))
  );
  const [status, setStatus] = useState<{ jenis: "ok" | "galat"; teks: string } | null>(null);

  const angkaBloom = Object.fromEntries(LEVEL_BLOOM.map((l) => [l, parseInt(bloom[l]) || 0]));
  const total = totalBloom(angkaBloom);

  function terapkan(nilai: typeof PREFERENSI_BAWAAN) {
    setJumlahButir(String(nilai.jumlahButir));
    setDurasi(String(nilai.durasiMenit));
    setBloom(Object.fromEntries(LEVEL_BLOOM.map((l) => [l, String(nilai.distribusiBloom[l])])));
  }

  function simpan(e: React.FormEvent) {
    e.preventDefault();
    const jumlah = parseInt(jumlahButir);
    const menit = parseInt(durasi);
    if (!(jumlah >= BATAS.jumlahButir.min && jumlah <= BATAS.jumlahButir.max)) {
      setStatus({ jenis: "galat", teks: p.jumlahButirTidakValid(BATAS.jumlahButir.min, BATAS.jumlahButir.max) });
      return;
    }
    if (!(menit >= BATAS.durasiMenit.min && menit <= BATAS.durasiMenit.max)) {
      setStatus({ jenis: "galat", teks: p.durasiTidakValid(BATAS.durasiMenit.min, BATAS.durasiMenit.max) });
      return;
    }
    if (total !== 100) {
      setStatus({ jenis: "galat", teks: p.totalBloomTidakPas(total) });
      return;
    }
    simpanPreferensi({ jumlahButir: jumlah, durasiMenit: menit, distribusiBloom: angkaBloom });
    setStatus({ jenis: "ok", teks: p.tersimpan });
  }

  function kembalikan() {
    hapusPreferensi();
    terapkan(PREFERENSI_BAWAAN);
    setStatus({ jenis: "ok", teks: p.dikembalikan });
  }

  return (
    <form onSubmit={simpan} className="mt-3 space-y-5 border-y border-[var(--line)] py-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          id="preferensi-jumlah-butir"
          label={p.jumlahButir}
          type="number"
          min={BATAS.jumlahButir.min}
          max={BATAS.jumlahButir.max}
          value={jumlahButir}
          onChange={(e) => setJumlahButir(e.target.value)}
          helper={p.bantuanJumlahButir}
          className="font-mono tabular-nums"
        />
        <Input
          id="preferensi-durasi"
          label={p.durasi}
          type="number"
          min={BATAS.durasiMenit.min}
          max={BATAS.durasiMenit.max}
          value={durasi}
          onChange={(e) => setDurasi(e.target.value)}
          helper={p.bantuanDurasi}
          className="font-mono tabular-nums"
        />
      </div>

      <fieldset>
        <legend className="flex w-full items-baseline justify-between text-sm font-medium text-[var(--ink)]">
          <span>{p.distribusiBloom}</span>
          <span
            className={`font-mono text-xs tabular-nums ${total === 100 ? "text-[#1F6B3A]" : "text-[#A4262C]"}`}
          >
            {p.total(total)}
          </span>
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {LEVEL_BLOOM.map((level) => (
            <label
              key={level}
              className="flex flex-col gap-1.5 rounded-md border border-[var(--line)] bg-[var(--canvas)] p-2.5"
            >
              <span className="flex items-baseline gap-1.5">
                <span className="rounded border border-[var(--line)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--accent)]">
                  {level}
                </span>
                <span className="text-[11px] text-[var(--ink-muted)]">{namaBloom[level]}</span>
              </span>
              <span className="flex items-baseline justify-end gap-1 rounded border border-[var(--line-strong)] px-2 py-1 focus-within:border-[var(--accent)]">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={bloom[level]}
                  onChange={(e) => setBloom((b) => ({ ...b, [level]: e.target.value }))}
                  aria-label={`${level} ${namaBloom[level]}`}
                  className="w-full bg-transparent text-right font-mono text-sm tabular-nums text-[var(--ink)] focus:outline-none"
                />
                <span className="text-xs text-[var(--ink-muted)]">%</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="text-xs text-[var(--ink-muted)]">{p.catatanPerangkat}</p>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">{p.simpan}</Button>
        <Button type="button" variant="ghost" onClick={kembalikan}>
          {p.kembalikan}
        </Button>
        {status && (
          <p
            role={status.jenis === "galat" ? "alert" : "status"}
            className={`text-sm ${status.jenis === "galat" ? "text-[#A4262C]" : "text-[#1F6B3A]"}`}
          >
            {status.teks}
          </p>
        )}
      </div>
    </form>
  );
}
