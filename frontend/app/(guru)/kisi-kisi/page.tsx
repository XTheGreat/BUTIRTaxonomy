"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
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

const BLOOM_LEVELS = ["C1", "C2", "C3", "C4", "C5", "C6"];
const BLOOM_LABELS: Record<string, string> = {
  C1: "Mengingat",
  C2: "Memahami",
  C3: "Menerapkan",
  C4: "Menganalisis",
  C5: "Mengevaluasi",
  C6: "Mencipta",
};

export default function KisiKisiPage() {
  const router = useRouter();
  const [materiList, setMateriList] = useState<Materi[]>([]);
  const [selectedMateri, setSelectedMateri] = useState<string[]>([]);
  const [jumlahButir, setJumlahButir] = useState(5);
  const [bloom, setBloom] = useState<Record<string, number>>({
    C1: 0,
    C2: 20,
    C3: 30,
    C4: 30,
    C5: 20,
    C6: 0,
  });
  const [namaKisi, setNamaKisi] = useState("");
  const [cakupanBab, setCakupanBab] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tersimpan, setTersimpan] = useState<KisiKisiRingkas[]>([]);
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
      setError(`Total persentase distribusi Bloom harus tepat 100% (saat ini ${bloomTotal}%).`);
      return false;
    }
    if (selectedMateri.length === 0) {
      setError("Pilih minimal satu materi ajar sebagai rujukan.");
      return false;
    }
    if (jumlahButir < 1 || jumlahButir > 50) {
      setError("Jumlah butir harus antara 1 dan 50.");
      return false;
    }
    setError("");
    return true;
  }

  function kosongkanForm() {
    setEditId(null);
    setSelectedMateri([]);
    setJumlahButir(5);
    setBloom({ C1: 0, C2: 20, C3: 30, C4: 30, C5: 20, C6: 0 });
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
      setError(err.message || "Gagal menyimpan kisi-kisi.");
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
    setPesan(editId ? "Perubahan kisi-kisi disimpan." : "Kisi-kisi disimpan sebagai draf. Mulai debat kapan saja dari daftar di bawah.");
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
        setPesan("Kisi-kisi dihapus.");
        setAksiBaris(null);
      } else {
        const id = aksiBaris.item.id;
        setAksiBaris(null);
        await mulaiGenerasi(id);
      }
    } catch (err: any) {
      setError(err.message || "Aksi gagal dijalankan.");
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
        title="Rancang Kisi-kisi"
        description="Spesifikasi teknis proporsi kognitif Taksonomi Bloom dan materi rujukan butir ujian."
      />

      {pesan && (
        <div className="mb-4 text-xs leading-relaxed text-[#1F6B3A]">
          {pesan}
        </div>
      )}
      {editId && (
        <div className="mb-4 p-3 rounded bg-[#FBF1D9] border border-[#8A5A00]/30 text-xs text-[#8A5A00] flex items-center justify-between gap-3">
          <span>Sedang mengubah kisi-kisi tersimpan. Perubahan baru berlaku setelah disimpan.</span>
          <button type="button" onClick={kosongkanForm} className="underline font-medium shrink-0">
            Batal ubah
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
            Materi Pembelajaran Rujukan
          </label>
          <p className="text-xs text-[var(--ink-muted)] mb-3">
            Pilih satu atau lebih dokumen materi yang akan dijadikan basis ekstraksi butir.
          </p>

          {materiList.length === 0 ? (
            <div className="border border-dashed border-[var(--line-strong)]/40 bg-[var(--surface)]/40 p-6 text-center text-xs text-[var(--ink-muted)] rounded-lg flex flex-col items-center justify-center gap-2 select-none">
              <FolderOpen
                size={40}
                strokeWidth={1.25}
                className="text-[var(--ink-muted)]/65 fill-[var(--ink-muted)]/10"
              />
              <p>
                Belum ada materi ajar terdaftar.{" "}
                <Link href="/materi" className="text-[var(--accent)] underline font-medium hover:underline">
                  Unggah dokumen materi terlebih dahulu
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="border border-[var(--line)] bg-[var(--canvas)] divide-y divide-[var(--line)] max-h-48 overflow-y-auto rounded-lg">
              {materiList.map((m) => (
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
          )}
        </div>

        <div className="border border-[var(--line)] bg-[var(--surface)] p-5 rounded-lg">
          <Input
            label="Jumlah Target Butir Soal"
            type="number"
            min={1}
            max={50}
            value={jumlahButir}
            onChange={(e) => setJumlahButir(parseInt(e.target.value) || 1)}
            helper="Direkomendasikan 5–15 butir per siklus telaah deliberatif"
            className="w-28 font-sans font-medium tabular-nums"
            required
          />
        </div>

        <div className="border border-[var(--line)] bg-[var(--surface)] p-5 rounded-lg">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <label className="text-sm font-medium text-[var(--ink)] block">
                Distribusi Tingkat Kognitif Bloom (%)
              </label>
              <p className="text-xs text-[var(--ink-muted)]">
                Proporsi bobot butir soal dari tingkat dasar hingga tingkat tinggi (HOTS)
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                disabled={bloomTotal === 0}
                onClick={() => setBloom({ C1: 0, C2: 0, C3: 0, C4: 0, C5: 0, C6: 0 })}
                className="font-sans text-xs font-medium text-[var(--accent)] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-[var(--ink-muted)] disabled:no-underline focus-visible:outline-none"
              >
                Kosongkan semua
              </button>
              <div
                className={`font-sans text-xs font-medium tabular-nums transition-colors ${
                  bloomTotal === 100 ? "text-[#1F6B3A]" : "text-[#A4262C]"
                }`}
              >
                Total: <span className="font-semibold">{bloomTotal}%</span>
              </div>
            </div>
          </div>

          <BloomPieChart bloom={bloom} total={bloomTotal} />

          {bloomTotal !== 100 && (
            <p className="text-xs text-[#A4262C] mb-3">
              Total distribusi saat ini {bloomTotal}%. Harus persis 100% untuk melanjutkan.
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-1">
            {BLOOM_LEVELS.map((level) => (
              <div
                key={level}
                className="bg-[var(--canvas)] border border-[var(--line)] p-2.5 flex flex-col justify-between rounded-lg transition-shadow"
              >
                <div className="flex items-center justify-between gap-1.5 mb-2">
                  <span className="font-mono text-[11px] font-semibold text-[var(--accent)] px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--line)] rounded">
                    {level}
                  </span>
                  <span className="text-[11px] font-sans text-[var(--ink-muted)] truncate" title={BLOOM_LABELS[level]}>
                    {BLOOM_LABELS[level]}
                  </span>
                </div>
                <div className="flex items-baseline justify-end gap-1 px-2 py-1 bg-[var(--surface)] border border-[var(--line)] rounded focus-within:border-[var(--accent)] focus-within:bg-[var(--canvas)] focus-within:ring-1 focus-within:ring-[var(--accent)] transition-all">
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
            label="Nama Kisi-kisi (Opsional)"
            value={namaKisi}
            onChange={(e) => setNamaKisi(e.target.value)}
            maxLength={255}
            placeholder="Misal: Kisi-kisi A, atau UTS Fisika Kelas X"
            helper="Dipakai sebagai judul kelompok soal di Bank Soal dan Rakit Ujian. Bila kosong, memakai judul materi"
          />
          <Textarea
            label="Cakupan Bab & Fokus Indikator (Opsional)"
            value={cakupanBab}
            onChange={(e) => setCakupanBab(e.target.value)}
            placeholder="Misal: Fokuskan pada Hukum Newton II dan penerapannya pada bidang miring..."
            helper="Kata kunci dipakai untuk memilih potongan materi yang relevan, lalu diteruskan ke Agen Penyusun sebagai fokus soal"
            rows={3}
            autoResize
            maxHeight={220}
          />
        </div>

        {error && (
          <div className="text-xs leading-relaxed text-[#A4262C]">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            size="lg"
            disabled={loading || bloomTotal !== 100 || selectedMateri.length === 0}
          >
            {loading ? "Menyimpan..." : editId ? "Simpan Perubahan" : "Simpan Kisi-kisi"}
          </Button>
          <span className="text-xs text-[var(--ink-muted)]">
            Debat dimulai dari daftar Kisi-kisi Tersimpan di bawah, bukan otomatis.
          </span>
        </div>
      </form>

      <section id="kisi-tersimpan" className="mt-10">
        <div className="flex items-baseline justify-between border-b border-[var(--line)] pb-2 mb-4">
          <h2 className="font-serif text-lg font-normal text-[var(--ink)]">Kisi-kisi Tersimpan</h2>
          <span className="font-mono text-xs text-[var(--ink-muted)] tabular-nums">
            {tersimpan.length} kisi-kisi
          </span>
        </div>

        {tersimpan.length === 0 ? (
          <p className="text-xs text-[var(--ink-muted)]">
            Belum ada kisi-kisi. Simpan satu di atas; draf yang belum dijalankan bisa diubah atau dihapus.
          </p>
        ) : (
          <div className="border border-[var(--line)] bg-[var(--canvas)] divide-y divide-[var(--line)]">
            {tersimpan.map((k) => {
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
                      {k.nama || k.materi.map((m) => m.judul).join(", ") || "Tanpa materi"}
                    </p>
                    {k.nama && k.materi.length > 0 && (
                      <p className="mt-0.5 text-xs text-[var(--ink-muted)] truncate">
                        Materi: {k.materi.map((m) => m.judul).join(", ")}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                      {Object.entries(k.distribusi_bloom).map(([lv, v], i, semua) => (
                        <span key={lv} className="inline-flex items-center gap-1">
                          <span className="font-mono text-[10px] font-semibold text-[var(--accent)]">{lv}</span>
                          <span className="min-w-[28px] border border-[var(--line-strong)] rounded-sm bg-[var(--canvas)] px-1 text-center font-mono text-[10px] leading-4 tabular-nums text-[var(--ink)]">
                            {v}%
                          </span>
                          {i < semua.length - 1 && <span className="mr-0.5 font-mono text-[11px] text-[var(--ink-muted)]">;</span>}
                        </span>
                      ))}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-[var(--ink-muted)]">
                      <span>
                        Target <span className="font-mono tabular-nums text-[var(--ink)]">{k.jumlah_butir}</span> butir
                      </span>
                      {!draf && (
                        <span>
                          <span className="font-mono tabular-nums text-[var(--ink)]">{k.butir_dibuat}</span> butir dibuat
                        </span>
                      )}
                      {k.cakupan_bab && <span>Cakupan: {k.cakupan_bab}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs">
                    {draf ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setAksiBaris({ tipe: "mulai", item: k })}
                          className="text-[var(--accent)] hover:underline font-medium"
                        >
                          Mulai Generasi
                        </button>
                        <button
                          type="button"
                          onClick={() => mulaiUbah(k)}
                          className="text-[var(--accent)] hover:underline font-medium"
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() => setAksiBaris({ tipe: "hapus", item: k })}
                          className="text-[var(--ink-muted)] hover:text-[#A4262C] underline"
                        >
                          Hapus
                        </button>
                      </>
                    ) : (
                      <Link href={`/generasi/${k.id}`} className="text-[var(--accent)] hover:underline font-medium">
                        Lihat Progres
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={aksiBaris?.tipe === "mulai"}
        title="Mulai Debat Multi-Agen"
        description="Kisi-kisi ini akan dijalankan sekarang. Setelah dimulai, kisi-kisi tidak bisa diubah atau dihapus."
        confirmLabel="Mulai Generasi"
        loading={aksiLoading}
        onConfirm={handleAksiBaris}
        onCancel={() => setAksiBaris(null)}
      >
        {aksiBaris?.tipe === "mulai" && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-baseline">
              <span className="text-[var(--ink-muted)] text-xs">Jumlah butir target</span>
              <span className="font-mono tabular-nums font-medium text-[var(--ink)]">
                {aksiBaris.item.jumlah_butir}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[var(--ink-muted)] text-xs">Materi rujukan</span>
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
        title="Hapus Kisi-kisi"
        description="Kisi-kisi draf ini akan dihapus permanen. Materi ajar tidak ikut terhapus."
        confirmLabel="Hapus"
        variant="destructive"
        loading={aksiLoading}
        onConfirm={handleAksiBaris}
        onCancel={() => setAksiBaris(null)}
      />
    </div>
  );
}

function PratinjauCakupan({ cek }: { cek: CekCakupan | null }) {
  if (!cek || !cek.ada_cakupan) return null;
  const cocok = cek.potongan_cocok > 0;
  return (
    <div
      className={`text-xs leading-relaxed ${
        cocok ? "text-[#1F6B3A]" : "text-[#8A5A00]"
      }`}
    >
      {cocok
        ? `Cakupan cocok dengan ${cek.potongan_cocok} dari ${cek.jumlah_potongan} potongan materi; soal dibuat dari potongan itu.`
        : `Cakupan tidak ditemukan di materi (kata kunci: ${cek.kata_kunci.join(", ")}). Seluruh materi akan dipakai.`}
    </div>
  );
}
