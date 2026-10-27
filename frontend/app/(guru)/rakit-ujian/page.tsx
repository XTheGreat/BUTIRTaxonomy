"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ArsipSoal, ButirSoal } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import BloomText from "@/components/ui/BloomText";
import BatangBloom from "@/components/ui/BatangBloom";
import FilterButir, { FILTER_AWAL, filterAktif, NilaiFilterButir } from "@/components/ui/FilterButir";
import { BLOOM_COLORS, type BloomLevel } from "@/components/ui/BloomPieChart";
import BloomChip from "@/components/ui/BloomChip";
import KelompokLipat, { useBukaTutup } from "@/components/ui/KelompokLipat";
import { KelompokBank, kelompokkan } from "@/lib/kelompokBank";
import EmptyState from "@/components/ui/EmptyState";
import MathText from "@/components/ui/MathText";
import { useTeks } from "@/lib/teks";

const BLOOM_LEVELS = ["C1", "C2", "C3", "C4", "C5", "C6"];

interface RakitInfo {
  butir_ids: string[];
  total_bobot: number;
  per_level: Record<string, number>;
  kekurangan: Record<string, number>;
  kurang_total: number;
  ada_cakupan: boolean;
  cocok_cakupan: number;
  target_bobot: number | null;
  selisih_bobot: number | null;
}

export default function RakitUjianPage() {
  const t = useTeks().ujian;
  const router = useRouter();
  const [butirList, setButirList] = useState<ButirSoal[]>([]);
  const [kelompokList, setKelompokList] = useState<KelompokBank[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [judul, setJudul] = useState("");
  const [durasi, setDurasi] = useState(60);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [jumlahTarget, setJumlahTarget] = useState(10);
  const [bloom, setBloom] = useState<Record<string, number>>({
    C1: 0,
    C2: 20,
    C3: 30,
    C4: 30,
    C5: 20,
    C6: 0,
  });
  const [cakupanPaket, setCakupanPaket] = useState("");
  const [targetBobot, setTargetBobot] = useState("");
  const [rakitInfo, setRakitInfo] = useState<RakitInfo | null>(null);
  const [rakitLoading, setRakitLoading] = useState(false);
  const [arsipList, setArsipList] = useState<ArsipSoal[]>([]);
  const [sumber, setSumber] = useState<"bank" | "arsip">("bank");
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/bank-soal").catch(() => []),
      apiFetch("/api/bank-soal/kelompok").catch(() => []),
      apiFetch("/api/arsip").catch(() => []),
    ]).then(([data, kelompok, arsip]) => {
      setButirList(Array.isArray(data) ? data : []);
      setKelompokList(Array.isArray(kelompok) ? kelompok : []);
      setArsipList(Array.isArray(arsip) ? arsip : []);
      setSiap(true);
    });
  }, []);

  const { ada: kelompokTerbuka, toggle: bukaTutup } = useBukaTutup();
  const [filter, setFilter] = useState<NilaiFilterButir>(FILTER_AWAL);
  const sedangMenyaring = filterAktif(filter);
  const butirTampil = useMemo(() => {
    const kata = filter.cari.trim().toLowerCase();
    return butirList.filter(
      (b) =>
        (!filter.kisi || b.kisi_kisi_id === filter.kisi) &&
        (filter.bloom.length === 0 || filter.bloom.includes(b.level_bloom)) &&
        (!kata || b.pertanyaan.toLowerCase().includes(kata)) &&
        (!filter.hanyaTerpilih || selectedIds.includes(b.id))
    );
  }, [butirList, filter, selectedIds]);
  const grup = useMemo(() => kelompokkan(butirTampil, kelompokList), [butirTampil, kelompokList]);
  const totalBloom = Object.values(bloom).reduce((a, b) => a + b, 0);
  const tersedia = butirList.reduce<Record<string, number>>((acc, b) => {
    acc[b.level_bloom] = (acc[b.level_bloom] || 0) + 1;
    return acc;
  }, {});
  const totalBobotTerpilih =
    butirList.filter((b) => selectedIds.includes(b.id)).reduce((sum, b) => sum + (b.bobot_poin || 0), 0) +
    arsipList.filter((a) => selectedIds.includes(a.id)).reduce((sum, a) => sum + (a.bobot_poin || 0), 0);
  const arsipTampil = useMemo(() => {
    const kata = filter.cari.trim().toLowerCase();
    return arsipList.filter(
      (a) =>
        (!filter.kisi || a.kisi_kisi_id === filter.kisi) &&
        (!kata || a.pertanyaan.toLowerCase().includes(kata)) &&
        (!filter.hanyaTerpilih || selectedIds.includes(a.id))
    );
  }, [arsipList, filter, selectedIds]);

  async function handleRakitOtomatis() {
    setError("");
    setRakitLoading(true);
    try {
      const distribusi: Record<string, number> = {};
      for (const [lv, pct] of Object.entries(bloom)) {
        if (pct > 0) distribusi[lv] = pct;
      }
      const hasil: RakitInfo = await apiFetch("/api/ujian/rakit-otomatis", {
        method: "POST",
        body: JSON.stringify({
          jumlah_butir: jumlahTarget,
          distribusi_bloom: distribusi,
          cakupan_bab: cakupanPaket.trim() || null,
          target_bobot: targetBobot.trim() ? parseInt(targetBobot) : null,
        }),
      });
      setSelectedIds(hasil.butir_ids);
      setRakitInfo(hasil);
    } catch (err: any) {
      setError(err.message || t.rakit.otomatis.galat);
    } finally {
      setRakitLoading(false);
    }
  }

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function pilihKelompok(ids: string[]) {
    setSelectedIds((prev) => {
      const semua = ids.every((id) => prev.includes(id));
      return semua ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]));
    });
  }

  function selectAll() {
    const idsTampil = (sumber === "arsip" ? arsipTampil : butirTampil).map((b) => b.id);
    const semuaTerpilih = idsTampil.length > 0 && idsTampil.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      semuaTerpilih ? prev.filter((id) => !idsTampil.includes(id)) : Array.from(new Set([...prev, ...idsTampil]))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setError(t.rakit.pilihMin1);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const ujian = await apiFetch("/api/ujian", {
        method: "POST",
        body: JSON.stringify({
          judul,
          butir_ids: selectedIds,
          durasi_menit: durasi,
        }),
      });
      router.push(`/ujian/${ujian.id}`);
    } catch (err: any) {
      setError(err.message || t.rakit.galatBuat);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t.rakit.judul}
        description={t.rakit.deskripsi}
      />

      {!siap ? (
        <p className="font-mono text-xs text-[var(--ink-muted)]">{t.rakit.memuat}</p>
      ) : butirList.length === 0 && arsipList.length === 0 ? (
        <EmptyState
          title={t.rakit.bankKosongJudul}
          description={t.rakit.bankKosongDeskripsi}
          action={
            <Link href="/kisi-kisi">
              <Button size="sm">{t.rakit.buatKisiKisi}</Button>
            </Link>
          }
        />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          <div className="border border-[var(--line)] bg-[var(--surface)] p-5 space-y-4">
            <h2 className="font-serif text-lg font-normal text-[var(--ink)]">
              {t.rakit.konfigurasi.judul}
            </h2>

            <Input
              label={t.rakit.konfigurasi.labelJudul}
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder={t.rakit.konfigurasi.placeholderJudul}
              helper={t.rakit.konfigurasi.bantuanJudul}
              required
            />

            <div className="w-36">
              <Input
                label={t.rakit.konfigurasi.labelDurasi}
                type="number"
                min={5}
                max={240}
                value={durasi}
                onChange={(e) => setDurasi(parseInt(e.target.value) || 60)}
                helper={t.rakit.konfigurasi.bantuanDurasi}
                className="font-mono tabular-nums"
                required
              />
            </div>
          </div>

          <div className="border border-[var(--line)] bg-[var(--surface)] p-5 space-y-4">
            <div>
              <h2 className="font-serif text-lg font-normal text-[var(--ink)]">
                {t.rakit.otomatis.judul}
              </h2>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                {t.rakit.otomatis.deskripsi}
              </p>
            </div>

            <div className="w-36">
              <Input
                label={t.rakit.otomatis.jumlahButir}
                type="number"
                min={1}
                max={Math.max(butirList.length, 1)}
                value={jumlahTarget}
                onChange={(e) => setJumlahTarget(parseInt(e.target.value) || 1)}
                className="font-mono tabular-nums"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-4">
              <Input
                label={t.rakit.otomatis.labelCakupan}
                value={cakupanPaket}
                onChange={(e) => setCakupanPaket(e.target.value)}
                placeholder={t.rakit.otomatis.placeholderCakupan}
                helper={t.rakit.otomatis.bantuanCakupan}
                maxLength={2000}
              />
              <Input
                label={t.rakit.otomatis.labelTarget}
                type="number"
                min={1}
                value={targetBobot}
                onChange={(e) => setTargetBobot(e.target.value)}
                placeholder={t.rakit.otomatis.placeholderTarget}
                helper={t.rakit.otomatis.bantuanTarget}
                className="font-mono tabular-nums"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm font-medium text-[var(--ink)]">
                  {t.rakit.otomatis.distribusiBloom}
                </span>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    disabled={totalBloom === 0}
                    onClick={() => setBloom({ C1: 0, C2: 0, C3: 0, C4: 0, C5: 0, C6: 0 })}
                    className="font-sans text-xs font-medium text-[var(--accent)] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-[var(--ink-muted)] disabled:no-underline focus-visible:outline-none"
                  >
                    {t.rakit.otomatis.kosongkanSemua}
                  </button>
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      totalBloom === 100 ? "text-[#1F6B3A]" : "text-[#A4262C]"
                    }`}
                  >
                    {t.rakit.otomatis.total(totalBloom)}
                  </span>
                </div>
              </div>
              <div className="mb-3">
                <BatangBloom bloom={bloom} />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {BLOOM_LEVELS.map((lv) => (
                  <label key={lv} className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 shrink-0"
                        style={{ backgroundColor: BLOOM_COLORS[lv as BloomLevel] }}
                      />
                      <span className="font-mono text-xs font-semibold text-[var(--accent)]">{lv}</span>
                      <span
                        title={t.rakit.otomatis.tersedia(tersedia[lv] ?? 0)}
                        className="min-w-[22px] border border-[var(--line-strong)] rounded bg-[var(--canvas)] px-1.5 text-center font-mono text-[11px] leading-[18px] tabular-nums text-[var(--ink)]"
                      >
                        {tersedia[lv] ?? 0}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--ink-muted)]">{t.rakit.otomatis.butir}</span>
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={bloom[lv]}
                      onChange={(e) =>
                        setBloom((prev) => ({
                          ...prev,
                          [lv]: Math.max(0, parseInt(e.target.value) || 0),
                        }))
                      }
                      className="bg-[var(--canvas)] text-[var(--ink)] border border-[var(--line-strong)] rounded px-2 py-1.5 text-sm font-mono tabular-nums focus:outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                ))}
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={handleRakitOtomatis}
              disabled={rakitLoading || totalBloom !== 100}
            >
              {rakitLoading ? t.rakit.otomatis.tombolProses : t.rakit.otomatis.tombol}
            </Button>

            {rakitInfo && (
              <div className="border border-[var(--line)] bg-[var(--canvas)] p-3 text-xs space-y-1.5">
                <div className="font-mono tabular-nums text-[var(--ink)]">
                  {t.rakit.hasil.terpilih(rakitInfo.butir_ids.length, rakitInfo.total_bobot)}
                </div>
                <div className="font-mono tabular-nums text-[var(--ink-muted)]">
                  <BloomText
                    text={
                      Object.entries(rakitInfo.per_level)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([lv, n]) => `${lv}: ${n}`)
                        .join(" · ") || "-"
                    }
                  />
                </div>
                {rakitInfo.target_bobot !== null && rakitInfo.selisih_bobot !== null && (
                  <div
                    className={`font-mono tabular-nums ${
                      rakitInfo.selisih_bobot === 0 ? "text-[#1F6B3A]" : "text-[#8A5A00]"
                    }`}
                  >
                    {rakitInfo.selisih_bobot === 0
                      ? t.rakit.hasil.bobotTepat(rakitInfo.target_bobot)
                      : t.rakit.hasil.bobotMeleset(
                          rakitInfo.total_bobot,
                          rakitInfo.target_bobot,
                          rakitInfo.selisih_bobot > 0,
                          Math.abs(rakitInfo.selisih_bobot),
                        )}
                  </div>
                )}
                {rakitInfo.ada_cakupan && (
                  <div
                    className={`font-mono tabular-nums ${
                      rakitInfo.cocok_cakupan === rakitInfo.butir_ids.length
                        ? "text-[#1F6B3A]"
                        : "text-[#8A5A00]"
                    }`}
                  >
                    {t.rakit.hasil.cakupanCocok(rakitInfo.cocok_cakupan, rakitInfo.butir_ids.length)}
                    {rakitInfo.cocok_cakupan < rakitInfo.butir_ids.length &&
                      t.rakit.hasil.cakupanKurang}
                  </div>
                )}
                {(Object.keys(rakitInfo.kekurangan).length > 0 || rakitInfo.kurang_total > 0) && (
                  <div className="p-2 rounded bg-[#FBF1D9] border border-[#8A5A00]/30 text-[#8A5A00]">
                    {Object.keys(rakitInfo.kekurangan).length > 0 && (
                      <div>
                        {t.rakit.hasil.bankKurangUntuk}{" "}
                        <BloomText
                          text={Object.entries(rakitInfo.kekurangan)
                            .map(([lv, n]) => t.rakit.hasil.levelKurang(lv, n))
                            .join(", ")}
                        />
                        {t.rakit.hasil.kuotaDariLain}
                      </div>
                    )}
                    {rakitInfo.kurang_total > 0 && (
                      <div>
                        {t.rakit.hasil.paketKurang(rakitInfo.kurang_total)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border border-[var(--line)] bg-[var(--canvas)] p-5">
            <div className="flex flex-col gap-3 pb-3 mb-3 border-b border-[var(--line)] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-sm font-medium text-[var(--ink)] block">
                  {t.rakit.pilih.judul}
                </span>
                <span className="text-xs text-[var(--ink-muted)] font-mono tabular-nums">
                  {t.rakit.pilih.terpilih(selectedIds.length, butirList.length + arsipList.length, totalBobotTerpilih)}
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={selectAll}
              >
                {(() => {
                  const tampil = sumber === "arsip" ? arsipTampil : butirTampil;
                  return tampil.length > 0 && tampil.every((b) => selectedIds.includes(b.id))
                    ? t.rakit.pilih.batalPilihSemua
                    : sedangMenyaring
                      ? t.rakit.pilih.pilihSemuaN(tampil.length)
                      : t.rakit.pilih.pilihSemua;
                })()}
              </Button>
            </div>

            <div className="mb-3">
            <div role="tablist" aria-label={t.rakit.pilih.sumber} className="inline-flex border border-[var(--line-strong)]">
              {(
                [
                  ["bank", t.rakit.pilih.tabBank(butirList.length)],
                  ["arsip", t.rakit.pilih.tabArsip(arsipList.length)],
                ] as const
              ).map(([nilai, label]) => (
                <button
                  key={nilai}
                  type="button"
                  role="tab"
                  aria-selected={sumber === nilai}
                  onClick={() => setSumber(nilai)}
                  className={`px-3.5 py-1.5 font-sans text-xs font-medium transition-colors duration-[140ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                    sumber === nilai
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--canvas)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            </div>

            <FilterButir
              nilai={filter}
              onUbah={setFilter}
              kelompok={kelompokList}
              jumlahTampil={sumber === "arsip" ? arsipTampil.length : butirTampil.length}
              jumlahTotal={sumber === "arsip" ? arsipList.length : butirList.length}
              tanpaBloom={sumber === "arsip"}
            />

            {sumber === "arsip" && (
              <div className="daftar-gulir divide-y divide-[var(--line)] border border-[var(--line)]">
                {arsipTampil.length === 0 && (
                  <p className="px-4 py-8 text-center font-sans text-sm text-[var(--ink-muted)]">
                    {arsipList.length === 0 ? (
                      <>
                        {t.rakit.pilih.arsipKosongAwal}{" "}
                        <Link href="/riwayat-diterima" className="underline underline-offset-4 text-[var(--accent)]">
                          {t.rakit.pilih.riwayatDiterima}
                        </Link>
                        .
                      </>
                    ) : (
                      t.rakit.pilih.arsipTakCocok
                    )}
                  </p>
                )}
                {arsipTampil.map((a, i) => {
                  const isPreview = previewId === a.id;
                  return (
                    <div key={a.id}>
                      <div className="flex items-start gap-3 px-2 py-2.5 hover:bg-[var(--surface)] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(a.id)}
                          onChange={() => toggle(a.id)}
                          className="mt-1 accent-[var(--accent)]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="font-mono text-xs text-[var(--ink-muted)]">#{i + 1}</span>
                            <span className="truncate font-serif text-xs text-[var(--ink-muted)]">{a.kisi_kisi_label}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewId(isPreview ? null : a.id);
                              }}
                              className="ml-auto text-[11px] font-medium text-[var(--accent)] hover:underline focus-visible:outline-none"
                            >
                              {isPreview ? t.rakit.pilih.tutup : t.rakit.pilih.pratinjau}
                            </button>
                          </div>
                          <p
                            className={`font-serif text-sm leading-relaxed text-[var(--ink)] ${isPreview ? "" : "line-clamp-2"}`}
                            onClick={() => toggle(a.id)}
                          >
                            <MathText text={a.pertanyaan} />
                          </p>
                        </div>
                      </div>
                      {isPreview && (
                        <div className="space-y-1.5 pb-3 pl-10 pr-3">
                          {Object.entries(a.pilihan).map(([key, val]) => (
                            <div
                              key={key}
                              className="flex items-start gap-2 rounded border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-sm"
                            >
                              <span className="w-5 shrink-0 pt-0.5 font-mono text-xs font-semibold text-[var(--ink-muted)]">{key}.</span>
                              <span className="font-serif text-sm leading-normal text-[var(--ink)]">
                                <MathText text={val} />
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className={`daftar-gulir space-y-3 sm:pr-1 ${sumber === "arsip" ? "hidden" : ""}`}>
              {grup.length === 0 && (
                <p className="border border-dashed border-[var(--line-strong)] px-4 py-8 text-center font-sans text-sm text-[var(--ink-muted)]">
                  {t.rakit.pilih.butirTakCocok}
                </p>
              )}
              {grup.map((g) => {
                const idsGrup = g.butir.map((b) => b.id);
                const semuaTerpilih = idsGrup.every((id) => selectedIds.includes(id));
                return (
                  <KelompokLipat
                    key={g.kelompok.id}
                    bingkai
                    kelompok={g.kelompok}
                    jumlah={g.butir.length}
                    terbuka={sedangMenyaring || kelompokTerbuka(g.kelompok.id)}
                    onToggle={() => bukaTutup(g.kelompok.id)}
                    tambahan={
                      <span>
                        <span className="font-mono tabular-nums text-[var(--accent)]">
                          {idsGrup.filter((id) => selectedIds.includes(id)).length}
                        </span>{" "}
                        {t.rakit.pilih.dipilih}
                      </span>
                    }
                    aksi={
                      <button
                        type="button"
                        onClick={() => pilihKelompok(idsGrup)}
                        className="shrink-0 text-xs font-medium text-[var(--accent)] hover:underline focus-visible:outline-none"
                      >
                        {semuaTerpilih ? t.rakit.pilih.batalPilihKelompok : t.rakit.pilih.pilihKelompok}
                      </button>
                    }
                  >
                    <div className="divide-y divide-[var(--line)]">
              {g.butir.map((butir, i) => {
                const isPreview = previewId === butir.id;
                return (
                  <div key={butir.id} className="transition-colors duration-[140ms]">
                    <div className="flex items-start gap-3 py-2.5 px-2 hover:bg-[var(--surface)] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(butir.id)}
                        onChange={() => toggle(butir.id)}
                        className="mt-1 accent-[var(--accent)]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-[var(--ink-muted)]">
                            #{i + 1}
                          </span>
                          <BloomChip level={butir.level_bloom} target={butir.level_target} />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewId(isPreview ? null : butir.id);
                            }}
                            className="ml-auto text-[11px] text-[var(--accent)] hover:underline font-medium focus-visible:outline-none"
                          >
                            {isPreview ? t.rakit.pilih.tutup : t.rakit.pilih.pratinjau}
                          </button>
                        </div>
                        <p
                          className={`font-serif text-sm text-[var(--ink)] leading-relaxed ${
                            isPreview ? "" : "line-clamp-2"
                          }`}
                          onClick={() => toggle(butir.id)}
                        >
                          <MathText text={butir.pertanyaan} />
                        </p>
                      </div>
                    </div>
                    {isPreview && butir.pilihan && (
                      <div className="pl-10 pr-3 pb-3 space-y-1.5">
                        {Object.entries(butir.pilihan).map(([key, val]) => (
                          <div
                            key={key}
                            className="flex items-start gap-2 text-sm py-1 px-2 bg-[var(--surface)] border border-[var(--line)] rounded"
                          >
                            <span className="font-mono text-xs font-semibold text-[var(--ink-muted)] w-5 shrink-0 pt-0.5">
                              {key}.
                            </span>
                            <span className="font-serif text-[var(--ink)] text-sm leading-normal">
                              <MathText text={val} />
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
                    </div>
                  </KelompokLipat>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="p-3 text-xs leading-relaxed text-[#A4262C]">
              {error}
            </div>
          )}

          <div>
            <Button
              type="submit"
              disabled={loading || selectedIds.length === 0}
              size="lg"
            >
              {loading ? t.rakit.terbitkanProses : t.rakit.terbitkan}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
