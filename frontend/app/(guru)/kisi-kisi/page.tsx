"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { bacaPreferensi } from "@/lib/preferensi";
import { formatWaktu } from "@/lib/format";
import { CekCakupan, KisiKisiRingkas, Materi } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import BloomPieChart from "@/components/ui/BloomPieChart";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import StatusBadge from "@/components/ui/StatusBadge";
import { FolderOpen } from "lucide-react";
import { useTeks } from "@/lib/teks";
import { susunNomorHalaman } from "@/lib/pagination";

const BLOOM_LEVELS = ["C1", "C2", "C3", "C4", "C5", "C6"];
const KISI_PER_HALAMAN = 5;
const MATERI_RUJUKAN_PER_HALAMAN = 11;
export default function KisiKisiPage() {
  const t = useTeks();
  const tk = t.persiapan.kisiKisi;
  const BLOOM_LABELS = tk.bloom;
  const router = useRouter();
  const [materiList, setMateriList] = useState<Materi[]>([]);
  const [halamanMateriRujukan, setHalamanMateriRujukan] = useState(1);
  const [selectedMateri, setSelectedMateri] = useState<string[]>([]);
  const [jumlahButir, setJumlahButir] = useState(() => bacaPreferensi().jumlahButir);
  const [bloom, setBloom] = useState<Record<string, number>>(() => bacaPreferensi().distribusiBloom);
  const [namaKisi, setNamaKisi] = useState("");
  const [cakupanBab, setCakupanBab] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tersimpan, setTersimpan] = useState<KisiKisiRingkas[]>([]);
  const [halamanTersimpan, setHalamanTersimpan] = useState(1);
  const [editId, setEditId] = useState<string | null>(null);
  const [pesan, setPesan] = useState("");
  const [aksiBaris, setAksiBaris] = useState<
    { tipe: "mulai" | "hapus"; item: KisiKisiRingkas } | null
  >(null);
  const [aksiLoading, setAksiLoading] = useState(false);
  const [cekCakupan, setCekCakupan] = useState<CekCakupan | null>(null);

  async function muatTersimpan() {
    try {
      const data = await apiFetch("/api/kisi-kisi");
      setTersimpan(Array.isArray(data) ? data : []);
    } catch {
      setTersimpan([]);
    }
  }

  useEffect(() => {
    apiFetch("/api/materi")
      .then((data) => setMateriList(Array.isArray(data) ? data : []))
      .catch(() => {});
    muatTersimpan();
  }, []);

  useEffect(() => {
    const dialogTerbuka = aksiBaris?.tipe === "mulai";
    if (!dialogTerbuka) {
      setCekCakupan(null);
      return;
    }
    const materiIds = aksiBaris?.tipe === "mulai" ? aksiBaris.item.materi.map((m) => m.id) : [];
    const cakupan = aksiBaris?.tipe === "mulai" ? aksiBaris.item.cakupan_bab : null;
    let batal = false;
    apiFetch("/api/kisi-kisi/cek-cakupan", {
      method: "POST",
      body: JSON.stringify({ materi_ids: materiIds, cakupan_bab: cakupan || null }),
    })
      .then((hasil) => !batal && setCekCakupan(hasil))
      .catch(() => !batal && setCekCakupan(null));
    return () => {
      batal = true;
    };
  }, [aksiBaris]);

  const bloomTotal = Object.values(bloom).reduce((a, b) => a + b, 0);
  const jumlahHalamanMateri = Math.max(1, Math.ceil(materiList.length / MATERI_RUJUKAN_PER_HALAMAN));
  const halamanMateriAktif = Math.min(halamanMateriRujukan, jumlahHalamanMateri);
  const indeksAwalMateri = (halamanMateriAktif - 1) * MATERI_RUJUKAN_PER_HALAMAN;
  const materiRujukanTerlihat = materiList.slice(indeksAwalMateri, indeksAwalMateri + MATERI_RUJUKAN_PER_HALAMAN);
  const jumlahHalamanTersimpan = Math.max(1, Math.ceil(tersimpan.length / KISI_PER_HALAMAN));
  const halamanAktif = Math.min(halamanTersimpan, jumlahHalamanTersimpan);
  const nomorHalamanTersimpan = susunNomorHalaman(halamanAktif, jumlahHalamanTersimpan);
  const indeksAwalTersimpan = (halamanAktif - 1) * KISI_PER_HALAMAN;
  const kisiTersimpanTerlihat = tersimpan.slice(indeksAwalTersimpan, indeksAwalTersimpan + KISI_PER_HALAMAN);

  const navigasiMateriRujukan = jumlahHalamanMateri > 1 && (
    <nav
      aria-label={tk.materiRujukan.navigasiHalaman}
      className="mt-3 flex flex-wrap items-center justify-between gap-3 border-y border-[var(--line)] py-2.5"
    >
      <span className="text-xs text-[var(--ink-muted)] tabular-nums">
        {tk.materiRujukan.rentang(indeksAwalMateri + 1, indeksAwalMateri + materiRujukanTerlihat.length, materiList.length)}
      </span>
      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="!h-7 !w-7 !p-0 shrink-0"
          aria-label={tk.materiRujukan.sebelumnya}
          disabled={halamanMateriAktif === 1}
          onClick={() => setHalamanMateriRujukan(halamanMateriAktif - 1)}
        >
          ‹
        </Button>
        <span className="min-w-24 text-center text-xs text-[var(--ink-muted)] tabular-nums" aria-live="polite">
          {tk.materiRujukan.halaman(halamanMateriAktif, jumlahHalamanMateri)}
        </span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="!h-7 !w-7 !p-0 shrink-0"
          aria-label={tk.materiRujukan.berikutnya}
          disabled={halamanMateriAktif === jumlahHalamanMateri}
          onClick={() => setHalamanMateriRujukan(halamanMateriAktif + 1)}
        >
          ›
        </Button>
      </div>
    </nav>
  );

  function bukaHalamanTersimpan(halaman: number) {
    setHalamanTersimpan(halaman);
    document.getElementById("kisi-tersimpan")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const navigasiTersimpan = jumlahHalamanTersimpan > 1 && (
    <nav
      aria-label={tk.tersimpan.navigasiHalaman}
      className="mt-3 flex flex-wrap items-center justify-between gap-3 border-y border-[var(--line)] py-2.5"
    >
      <span className="text-xs text-[var(--ink-muted)] tabular-nums">
        {tk.tersimpan.rentang(indeksAwalTersimpan + 1, indeksAwalTersimpan + kisiTersimpanTerlihat.length, tersimpan.length)}
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="!h-7 !w-7 !p-0 shrink-0"
          aria-label={tk.tersimpan.sebelumnya}
          disabled={halamanAktif === 1}
          onClick={() => bukaHalamanTersimpan(halamanAktif - 1)}
        >
          ‹
        </Button>
        <div role="group" aria-label={tk.tersimpan.navigasiHalaman} className="flex items-center gap-0.5">
          {nomorHalamanTersimpan.map((nomor, indeks) => typeof nomor === "number" ? (
            <button
              key={nomor}
              type="button"
              aria-label={tk.tersimpan.halaman(nomor, jumlahHalamanTersimpan)}
              aria-current={nomor === halamanAktif ? "page" : undefined}
              onClick={() => bukaHalamanTersimpan(nomor)}
              className={`inline-flex h-7 min-w-6 items-center justify-center border px-1 font-mono text-xs tabular-nums transition-colors duration-[140ms] ${
                nomor === halamanAktif
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
                  : "border-[var(--line-strong)] bg-[var(--canvas)] text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
              }`}
            >
              {nomor}
            </button>
          ) : (
            <span key={`${nomor}-${indeks}`} className="px-1 text-xs text-[var(--ink-muted)]" aria-hidden="true">
              …
            </span>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="!h-7 !w-7 !p-0 shrink-0"
          aria-label={tk.tersimpan.berikutnya}
          disabled={halamanAktif === jumlahHalamanTersimpan}
          onClick={() => bukaHalamanTersimpan(halamanAktif + 1)}
        >
          ›
        </Button>
      </div>
    </nav>
  );

  function handleBloomChange(level: string, value: string) {
    const num = Math.max(0, Math.min(100, parseInt(value) || 0));
    setBloom((prev) => ({ ...prev, [level]: num }));
  }

  function toggleMateri(id: string) {
    setSelectedMateri((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  function badanKisi() {
    const distribusi: Record<string, number> = {};
    for (const [k, v] of Object.entries(bloom)) {
      if (v > 0) distribusi[k] = v;
    }
    return {
      jumlah_butir: jumlahButir,
      distribusi_bloom: distribusi,
      cakupan_bab: cakupanBab.trim() || null,
      nama: namaKisi.trim() || null,
      materi_ids: selectedMateri,
    };
  }

  function validasiForm(): boolean {
    if (bloomTotal !== 100) {
      setError(tk.pesan.totalBloom(bloomTotal));
      return false;
    }
    if (selectedMateri.length === 0) {
      setError(tk.pesan.pilihMateri);
      return false;
    }
    if (jumlahButir < 1 || jumlahButir > 50) {
      setError(tk.pesan.rentangButir);
      return false;
    }
    setError("");
    return true;
  }

  function kosongkanForm() {
    setEditId(null);
    setSelectedMateri([]);
    const preferensi = bacaPreferensi();
    setJumlahButir(preferensi.jumlahButir);
    setBloom(preferensi.distribusiBloom);
    setCakupanBab("");
    setNamaKisi("");
  }

  async function simpanKisi(): Promise<string | null> {
    try {
      const kk = await apiFetch(editId ? `/api/kisi-kisi/${editId}` : "/api/kisi-kisi", {
        method: editId ? "PUT" : "POST",
        body: JSON.stringify(badanKisi()),
      });
      return kk.id;
    } catch (err: any) {
      setError(err.message || tk.pesan.gagalSimpan);
      return null;
    }
  }

  async function handleSimpan() {
    setPesan("");
    if (!validasiForm()) return;
    setLoading(true);
    const id = await simpanKisi();
    setLoading(false);
    if (!id) return;
    await muatTersimpan();
    setHalamanTersimpan(1);
    setPesan(editId ? tk.pesan.perubahanDisimpan : tk.pesan.disimpanSebagaiDraf);
    kosongkanForm();
    document.getElementById("kisi-tersimpan")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function mulaiGenerasi(kisiId: string) {
    try {
      await apiFetch(`/api/kisi-kisi/${kisiId}/generate`, { method: "POST" });
    } catch (err: any) {
      if (!/sudah pernah/i.test(err.message || "")) throw err;
    }
    router.push(`/generasi/${kisiId}?mulai=1`);
  }

  async function handleAksiBaris() {
    if (!aksiBaris) return;
    setAksiLoading(true);
    setPesan("");
    try {
      if (aksiBaris.tipe === "hapus") {
        await apiFetch(`/api/kisi-kisi/${aksiBaris.item.id}`, { method: "DELETE" });
        if (editId === aksiBaris.item.id) kosongkanForm();
        await muatTersimpan();
        setPesan(tk.pesan.dihapus);
        setAksiBaris(null);
      } else {
        const id = aksiBaris.item.id;
        setAksiBaris(null);
        await mulaiGenerasi(id);
      }
    } catch (err: any) {
      setError(err.message || tk.pesan.aksiGagal);
      setAksiBaris(null);
    } finally {
      setAksiLoading(false);
    }
  }

  function mulaiUbah(item: KisiKisiRingkas) {
    setEditId(item.id);
    setSelectedMateri(item.materi.map((m) => m.id));
    setJumlahButir(item.jumlah_butir);
    setBloom({ C1: 0, C2: 0, C3: 0, C4: 0, C5: 0, C6: 0, ...item.distribusi_bloom });
    setCakupanBab(item.cakupan_bab || "");
    setNamaKisi(item.nama || "");
    setError("");
    setPesan("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div>
      <PageHeader
        title={tk.judul}
        description={tk.deskripsi}
      />

      {pesan && (
        <div className="mb-4 text-xs leading-relaxed text-[var(--status-diterima)]">
          {pesan}
        </div>
      )}
      {editId && (
        <div className="mb-4 p-3 rounded bg-[var(--status-ditandai-bg)] border border-[var(--status-ditandai)]/30 text-xs text-[var(--status-ditandai)] flex items-center justify-between gap-3">
          <span>{tk.sedangMengubah}</span>
          <button type="button" onClick={kosongkanForm} className="underline font-medium shrink-0">
            {tk.batalUbah}
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSimpan();
        }}
        className="flex flex-col gap-6 w-full"
      >
        
        <div className="border border-[var(--line)] bg-[var(--surface)] p-5 rounded-lg">
          <label className="text-sm font-medium text-[var(--ink)] block mb-1">
            {tk.materiRujukan.label}
          </label>
          <p className="text-xs text-[var(--ink-muted)] mb-3">
            {tk.materiRujukan.keterangan}
          </p>

          {materiList.length === 0 ? (
            <div className="border border-dashed border-[var(--line-strong)]/40 bg-[var(--surface)]/40 p-6 text-center text-xs text-[var(--ink-muted)] rounded-lg flex flex-col items-center justify-center gap-2 select-none">
              <FolderOpen
                size={40}
                strokeWidth={1.25}
                className="text-[var(--ink-muted)]/65 fill-[var(--ink-muted)]/10"
              />
              <p>
                {tk.materiRujukan.kosong}{" "}
                <Link href="/materi" className="text-[var(--accent-text)] underline font-medium hover:underline">
                  {tk.materiRujukan.linkUnggah}
                </Link>
                .
              </p>
            </div>
          ) : (
            <>
              <div className="border border-[var(--line)] bg-[var(--canvas)] divide-y divide-[var(--line)] max-h-48 overflow-y-auto rounded-lg">
                {materiRujukanTerlihat.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-[var(--surface)] cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMateri.includes(m.id)}
                      onChange={() => toggleMateri(m.id)}
                      className="accent-[var(--accent)] rounded"
                    />
                    <span className="text-[var(--ink)]">{m.judul}</span>
                  </label>
                ))}
              </div>
              {navigasiMateriRujukan}
            </>
          )}
        </div>

        <div className="border border-[var(--line)] bg-[var(--surface)] p-5 rounded-lg">
          <Input
            label={tk.jumlahButir.label}
            type="number"
            min={1}
            max={50}
            value={jumlahButir}
            onChange={(e) => setJumlahButir(parseInt(e.target.value) || 1)}
            helper={tk.jumlahButir.bantuan}
            className="w-28 font-sans font-medium tabular-nums"
            required
          />
        </div>

        <div className="border border-[var(--line)] bg-[var(--surface)] p-5 rounded-lg">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <label className="text-sm font-medium text-[var(--ink)] block">
                {tk.distribusi.label}
              </label>
              <p className="text-xs text-[var(--ink-muted)]">
                {tk.distribusi.keterangan}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                disabled={bloomTotal === 0}
                onClick={() => setBloom({ C1: 0, C2: 0, C3: 0, C4: 0, C5: 0, C6: 0 })}
                className="font-sans text-xs font-medium text-[var(--accent-text)] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-[var(--ink-muted)] disabled:no-underline focus-visible:outline-none"
              >
                {tk.distribusi.kosongkanSemua}
              </button>
              <div
                className={`font-sans text-xs font-medium tabular-nums transition-colors ${
                  bloomTotal === 100 ? "text-[var(--status-diterima)]" : "text-[var(--status-ditolak)]"
                }`}
              >
                {tk.distribusi.total} <span className="font-semibold">{bloomTotal}%</span>
              </div>
            </div>
          </div>

          <BloomPieChart bloom={bloom} total={bloomTotal} />

          {bloomTotal !== 100 && (
            <p className="text-xs text-[var(--status-ditolak)] mb-3">
              {tk.distribusi.totalTidakPas(bloomTotal)}
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 pt-1">
            {BLOOM_LEVELS.map((level) => (
              <div
                key={level}
                className="bg-[var(--canvas)] border border-[var(--line)] p-2.5 flex flex-col justify-between rounded-lg transition-shadow"
              >
                <div className="flex items-center justify-between gap-1.5 mb-2">
                  <span className="font-mono text-[11px] font-semibold text-[var(--accent-text)] px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--line)] rounded">
                    {level}
                  </span>
                  <span className="text-[11px] font-sans text-[var(--ink-muted)] truncate" title={BLOOM_LABELS[level]}>
                    {BLOOM_LABELS[level]}
                  </span>
                </div>
                <div className="flex items-baseline justify-end gap-1 px-2 py-1 bg-[var(--surface)] border border-[var(--line)] rounded focus-within:border-[var(--accent-text)] focus-within:bg-[var(--canvas)] focus-within:ring-1 focus-within:ring-[var(--accent-text)] transition-all">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={bloom[level]}
                    onChange={(e) => handleBloomChange(level, e.target.value)}
                    className="w-full bg-transparent font-sans text-base font-semibold text-[var(--ink)] tabular-nums text-right focus:outline-none"
                  />
                  <span className="font-sans text-xs font-medium text-[var(--ink-muted)] select-none">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-[var(--line)] bg-[var(--surface)] p-5 rounded-lg space-y-4">
          <Input
            label={tk.opsional.labelNama}
            value={namaKisi}
            onChange={(e) => setNamaKisi(e.target.value)}
            maxLength={255}
            placeholder={tk.opsional.placeholderNama}
            helper={tk.opsional.bantuanNama}
          />
          <Textarea
            label={tk.opsional.labelCakupan}
            value={cakupanBab}
            onChange={(e) => setCakupanBab(e.target.value)}
            placeholder={tk.opsional.placeholderCakupan}
            helper={tk.opsional.bantuanCakupan}
            rows={3}
            autoResize
            maxHeight={220}
          />
        </div>

        {error && (
          <div className="text-xs leading-relaxed text-[var(--status-ditolak)]">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            size="lg"
            disabled={loading || bloomTotal !== 100 || selectedMateri.length === 0}
          >
            {loading ? tk.tombol.menyimpan : editId ? tk.tombol.simpanPerubahan : tk.tombol.simpan}
          </Button>
          <span className="text-xs text-[var(--ink-muted)]">
            {tk.tombol.catatanDebat}
          </span>
        </div>
      </form>

      <section id="kisi-tersimpan" className="mt-10">
        <div className="flex items-baseline justify-between border-b border-[var(--line)] pb-2 mb-4">
          <h2 className="font-serif text-lg font-normal text-[var(--ink)]">{tk.tersimpan.judul}</h2>
          <span className="font-mono text-xs text-[var(--ink-muted)] tabular-nums">
            {tk.tersimpan.jumlah(tersimpan.length)}
          </span>
        </div>

        {tersimpan.length === 0 ? (
          <p className="text-xs text-[var(--ink-muted)]">
            {tk.tersimpan.kosong}
          </p>
        ) : (
          <>
          <div id="daftar-kisi-tersimpan" className="border border-[var(--line)] bg-[var(--canvas)] divide-y divide-[var(--line)]">
            {kisiTersimpanTerlihat.map((k) => {
              const draf = k.butir_dibuat === 0;
              const status = draf ? "draft" : k.butir_berjalan > 0 ? "debating" : "selesai";
              return (
                <div key={k.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={status} />
                      <span className="font-mono text-[11px] text-[var(--ink-muted)] tabular-nums">
                        {formatWaktu(k.created_at)}
                      </span>
                    </div>
                    <p className="font-serif text-sm text-[var(--ink)] truncate">
                      {k.nama || k.materi.map((m) => m.judul).join(", ") || tk.tersimpan.tanpaMateri}
                    </p>
                    {k.nama && k.materi.length > 0 && (
                      <p className="mt-0.5 text-xs text-[var(--ink-muted)] truncate">
                        {tk.tersimpan.materi} {k.materi.map((m) => m.judul).join(", ")}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                      {Object.entries(k.distribusi_bloom).map(([lv, v], i, semua) => (
                        <span key={lv} className="inline-flex items-center gap-1">
                          <span className="font-mono text-[10px] font-semibold text-[var(--accent-text)]">{lv}</span>
                          <span className="min-w-[28px] border border-[var(--line-strong)] rounded-sm bg-[var(--canvas)] px-1 text-center font-mono text-[10px] leading-4 tabular-nums text-[var(--ink)]">
                            {v}%
                          </span>
                          {i < semua.length - 1 && <span className="mr-0.5 font-mono text-[11px] text-[var(--ink-muted)]">;</span>}
                        </span>
                      ))}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-[var(--ink-muted)]">
                      <span>
                        {tk.tersimpan.targetAwal} <span className="font-mono tabular-nums text-[var(--ink)]">{k.jumlah_butir}</span> {tk.tersimpan.targetAkhir}
                      </span>
                      {!draf && (
                        <span>
                          <span className="font-mono tabular-nums text-[var(--ink)]">{k.butir_dibuat}</span> {tk.tersimpan.butirDibuat}
                        </span>
                      )}
                      {k.cakupan_bab && <span>{tk.tersimpan.cakupan} {k.cakupan_bab}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs">
                    {draf ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setAksiBaris({ tipe: "mulai", item: k })}
                          className="text-[var(--accent-text)] hover:underline font-medium"
                        >
                          {tk.tersimpan.mulaiGenerasi}
                        </button>
                        <button
                          type="button"
                          onClick={() => mulaiUbah(k)}
                          className="text-[var(--accent-text)] hover:underline font-medium"
                        >
                          {tk.tersimpan.ubah}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAksiBaris({ tipe: "hapus", item: k })}
                          className="text-[var(--ink-muted)] hover:text-[var(--status-ditolak)] underline"
                        >
                          {t.persiapan.umum.hapus}
                        </button>
                      </>
                    ) : (
                      <Link href={`/generasi/${k.id}`} className="text-[var(--accent-text)] hover:underline font-medium">
                        {tk.tersimpan.lihatProgres}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {navigasiTersimpan}
          </>
        )}
      </section>

      <ConfirmDialog
        open={aksiBaris?.tipe === "mulai"}
        title={tk.dialogMulai.judul}
        description={tk.dialogMulai.deskripsi}
        confirmLabel={tk.dialogMulai.konfirmasi}
        loading={aksiLoading}
        onConfirm={handleAksiBaris}
        onCancel={() => setAksiBaris(null)}
      >
        {aksiBaris?.tipe === "mulai" && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-baseline">
              <span className="text-[var(--ink-muted)] text-xs">{tk.dialogMulai.jumlahTarget}</span>
              <span className="font-mono tabular-nums font-medium text-[var(--ink)]">
                {aksiBaris.item.jumlah_butir}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[var(--ink-muted)] text-xs">{tk.dialogMulai.materiRujukan}</span>
              <span className="text-xs text-[var(--ink)] text-right max-w-[200px] truncate">
                {aksiBaris.item.materi.map((m) => m.judul).join(", ")}
              </span>
            </div>
            <PratinjauCakupan cek={cekCakupan} />
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={aksiBaris?.tipe === "hapus"}
        title={tk.dialogHapus.judul}
        description={tk.dialogHapus.deskripsi}
        confirmLabel={tk.dialogHapus.konfirmasi}
        variant="destructive"
        loading={aksiLoading}
        onConfirm={handleAksiBaris}
        onCancel={() => setAksiBaris(null)}
      />
    </div>
  );
}

function PratinjauCakupan({ cek }: { cek: CekCakupan | null }) {
  const tk = useTeks().persiapan.kisiKisi;
  if (!cek || !cek.ada_cakupan) return null;
  const cocok = cek.potongan_cocok > 0;
  return (
    <div
      className={`text-xs leading-relaxed ${
        cocok ? "text-[var(--status-diterima)]" : "text-[var(--status-ditandai)]"
      }`}
    >
      {cocok
        ? tk.cakupan.cocok(cek.potongan_cocok, cek.jumlah_potongan)
        : tk.cakupan.tidakCocok(cek.kata_kunci.join(", "))}
    </div>
  );
}
