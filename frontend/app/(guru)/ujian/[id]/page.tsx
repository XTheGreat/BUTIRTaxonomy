"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { apiFetch, unduhBerkas } from "@/lib/api";
import { formatWaktu } from "@/lib/format";
import { PaketUjian, PesertaUjian } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import Input from "@/components/ui/Input";

function untukInputWaktu(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export default function UjianDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const ujianId = resolvedParams.id;

  const [ujian, setUjian] = useState<PaketUjian | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<"kode" | "tautan" | null>(null);
  const [denganKunci, setDenganKunci] = useState(false);
  const [mengekspor, setMengekspor] = useState<"pdf" | "docx" | null>(null);
  const [peserta, setPeserta] = useState<PesertaUjian[]>([]);
  const [pesertaLoading, setPesertaLoading] = useState(false);
  const [rilisHasil, setRilisHasil] = useState<"otomatis" | "manual">("otomatis");
  const [rilisLoading, setRilisLoading] = useState(false);
  const [waktuMulai, setWaktuMulai] = useState(() => untukInputWaktu(new Date()));
  const [waktuSelesai, setWaktuSelesai] = useState(() =>
    untukInputWaktu(new Date(Date.now() + 24 * 60 * 60 * 1000))
  );

  async function loadUjian() {
    try {
      const data = await apiFetch(`/api/ujian/${ujianId}`);
      setUjian(data);
      if (data?.status === "aktif") muatPeserta();
    } catch {}
  }

  useEffect(() => {
    loadUjian();
  }, [ujianId]);

  async function handleTerbitkan() {
    setError("");
    const mulai = new Date(waktuMulai);
    const selesai = new Date(waktuSelesai);
    if (isNaN(mulai.getTime()) || isNaN(selesai.getTime())) {
      setError("Isi waktu mulai dan waktu selesai.");
      return;
    }
    if (selesai <= mulai) {
      setError("Waktu selesai harus setelah waktu mulai.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch(`/api/ujian/${ujianId}/terbitkan`, {
        method: "POST",
        body: JSON.stringify({
          waktu_mulai: mulai.toISOString(),
          waktu_selesai: selesai.toISOString(),
          rilis_hasil: rilisHasil,
        }),
      });
      await loadUjian();
    } catch (err: any) {
      setError(err.message || "Gagal menerbitkan ujian.");
    } finally {
      setLoading(false);
    }
  }

  async function muatPeserta() {
    setPesertaLoading(true);
    try {
      const data = await apiFetch(`/api/ujian/${ujianId}/peserta`);
      setPeserta(Array.isArray(data) ? data : []);
    } catch {
      setPeserta([]);
    } finally {
      setPesertaLoading(false);
    }
  }

  async function handleLepasSesi(p: PesertaUjian) {
    if (!p.id) return;
    if (
      !confirm(
        `Izinkan ${p.nama_siswa} masuk ulang? Perangkat lamanya tidak bisa lagi mengirim jawaban; jawaban yang sudah tersimpan tetap ada.`
      )
    )
      return;
    setError("");
    try {
      await apiFetch(`/api/ujian/${ujianId}/peserta/${p.id}/lepas-sesi`, { method: "POST" });
      await muatPeserta();
    } catch (err: any) {
      setError(err.message || "Gagal melepas sesi peserta.");
    }
  }

  async function handleRilis(dirilis: boolean) {
    setError("");
    setRilisLoading(true);
    try {
      const baru = await apiFetch(`/api/ujian/${ujianId}/rilis-hasil`, {
        method: "PUT",
        body: JSON.stringify({ dirilis }),
      });
      setUjian(baru);
    } catch (err: any) {
      setError(err.message || "Gagal mengubah rilis hasil.");
    } finally {
      setRilisLoading(false);
    }
  }

  async function handleExport(format: "pdf" | "docx") {
    setError("");
    setMengekspor(format);
    try {
      await unduhBerkas(
        `/api/ujian/${ujianId}/export?format=${format}&kunci=${denganKunci}`,
        `ujian.${format}`
      );
    } catch (err: any) {
      setError(err.message || "Gagal mengunduh naskah.");
    } finally {
      setMengekspor(null);
    }
  }

  function handleCopy(apa: "kode" | "tautan") {
    if (!ujian?.kode_akses) return;
    const teks =
      apa === "kode"
        ? ujian.kode_akses
        : `${window.location.origin}/akses-ujian/${ujian.kode_akses}`;
    navigator.clipboard.writeText(teks);
    setCopied(apa);
    setTimeout(() => setCopied(null), 2000);
  }

  if (!ujian) {
    return (
      <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono">
        Memuat rincian paket ujian...
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={ujian.judul}
        description="Spesifikasi paket ujian, kode otorisasi akses peserta, dan status penerbitan."
        action={
          <Link href={`/laporan/${ujianId}`}>
            <Button variant="secondary" size="sm">
              Laporan Analisis
            </Button>
          </Link>
        }
      />

      {ujian.kode_akses && (
        <div className="border border-[var(--line-strong)] bg-[var(--surface)] p-4 sm:p-6 mb-8 text-center rounded-none">
          <span className="text-xs font-sans text-[var(--ink-muted)] block">
            Kode Akses Peserta
          </span>
          <div className="font-mono text-3xl sm:text-5xl font-bold tracking-widest sm:tracking-[0.3em] text-[var(--ink)] my-3 select-all break-all sm:pl-[0.3em]">
            {ujian.kode_akses}
          </div>
          <p className="text-xs text-[var(--ink-muted)] mb-4 max-w-sm mx-auto">
            Peserta membuka halaman Masuk ke Ujian lalu memasukkan kode ini, atau langsung
            memakai tautan ujian.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleCopy("kode")}
              className="font-mono text-xs"
            >
              {copied === "kode" ? "✓ Kode tersalin" : "Salin Kode Akses"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleCopy("tautan")}
              className="font-mono text-xs"
            >
              {copied === "tautan" ? "✓ Tautan tersalin" : "Salin Tautan Ujian"}
            </Button>
          </div>
        </div>
      )}

      {ujian.status === "aktif" && (
        <div className="border border-[var(--line)] bg-[var(--canvas)] p-6 mb-6">
          <div className="flex items-baseline justify-between border-b border-[var(--line)] pb-2 mb-4">
            <h2 className="font-serif text-lg font-normal text-[var(--ink)]">Peserta</h2>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-[var(--ink-muted)] tabular-nums">
                {peserta.filter((p) => p.terkumpul).length} / {peserta.length} terkumpul
              </span>
              <button
                type="button"
                onClick={muatPeserta}
                disabled={pesertaLoading}
                className="text-xs text-[var(--accent)] hover:underline font-medium disabled:opacity-50"
              >
                {pesertaLoading ? "Memuat..." : "Muat ulang"}
              </button>
            </div>
          </div>
          {peserta.length === 0 ? (
            <p className="text-xs text-[var(--ink-muted)]">Belum ada peserta yang masuk.</p>
          ) : (
            <div className="divide-y divide-[var(--line)] text-sm">
              {peserta.map((p) => (
                <div key={p.id ?? p.nama_siswa} className="py-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-serif text-[var(--ink)]">{p.nama_siswa}</span>
                    {p.masuk_pada && (
                      <span className="ml-2 font-mono text-[11px] text-[var(--ink-muted)] tabular-nums">
                        masuk {formatWaktu(p.masuk_pada)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-mono tabular-nums text-[var(--ink-muted)]">
                      {p.terjawab}/{p.total_soal} terjawab
                    </span>
                    <span className={p.terkumpul ? "text-[#1F6B3A] font-medium" : "text-[#8A5A00] font-medium"}>
                      {p.terkumpul ? "Terkumpul" : "Mengerjakan"}
                    </span>
                    {p.id && !p.terkumpul && (
                      <button
                        type="button"
                        onClick={() => handleLepasSesi(p)}
                        title="Izinkan peserta ini masuk dari perangkat lain"
                        className="text-[var(--ink-muted)] hover:text-[var(--ink)] underline"
                      >
                        Izinkan masuk ulang
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {ujian.status === "aktif" && (
        <div className="border border-[var(--line)] bg-[var(--canvas)] p-6 mb-6">
          <h2 className="font-serif text-lg font-normal text-[var(--ink)] border-b border-[var(--line)] pb-2 mb-4">
            Hasil Peserta
          </h2>
          {ujian.rilis_hasil === "manual" ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <span
                  className={`font-medium ${ujian.hasil_dirilis ? "text-[#1F6B3A]" : "text-[#8A5A00]"}`}
                >
                  {ujian.hasil_dirilis ? "Hasil sudah dirilis" : "Hasil belum dirilis"}
                </span>
                <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                  {ujian.hasil_dirilis
                    ? "Peserta yang sudah mengumpulkan dapat melihat skor dan kunci jawaban."
                    : "Peserta yang sudah mengumpulkan hanya melihat pesan bahwa hasil belum tersedia."}
                </p>
              </div>
              <Button
                variant={ujian.hasil_dirilis ? "secondary" : "primary"}
                size="sm"
                disabled={rilisLoading}
                onClick={() => handleRilis(!ujian.hasil_dirilis)}
              >
                {rilisLoading ? "Memproses..." : ujian.hasil_dirilis ? "Tarik Kembali" : "Rilis Hasil Sekarang"}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-[var(--ink-muted)]">
              Rilis otomatis: peserta melihat skor dan kunci jawaban begitu mengumpulkan.
            </p>
          )}
        </div>
      )}

      <div className="border border-[var(--line)] bg-[var(--canvas)] p-6 mb-6">
        <h2 className="font-serif text-lg font-normal text-[var(--ink)] border-b border-[var(--line)] pb-2 mb-4">
          Cetak Naskah
        </h2>
        <p className="text-xs text-[var(--ink-muted)] mb-3">
          Unduh naskah soal untuk ujian luring atau arsip. Tanpa kunci, hasilnya adalah lembar
          soal untuk peserta.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)] cursor-pointer select-none mr-2">
            <input
              type="checkbox"
              checked={denganKunci}
              onChange={(e) => setDenganKunci(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Sertakan kunci jawaban dan pembahasan
          </label>
          {(["pdf", "docx"] as const).map((f) => (
            <Button
              key={f}
              variant="secondary"
              size="sm"
              disabled={mengekspor !== null}
              onClick={() => handleExport(f)}
            >
              {mengekspor === f ? "Menyiapkan..." : `Unduh ${f.toUpperCase()}`}
            </Button>
          ))}
        </div>
      </div>

      <div className="border border-[var(--line)] bg-[var(--canvas)] p-6 mb-6">
        <h2 className="font-serif text-lg font-normal text-[var(--ink)] border-b border-[var(--line)] pb-2 mb-4">
          Spesifikasi Naskah
        </h2>

        <div className="divide-y divide-[var(--line)] text-sm">
          <div className="py-2.5 flex justify-between items-center">
            <span className="text-xs text-[var(--ink-muted)] font-sans">
              Status Ujian
            </span>
            <StatusBadge status={ujian.status} />
          </div>

          <div className="py-2.5 flex justify-between items-center">
            <span className="text-xs text-[var(--ink-muted)] font-sans">
              Jumlah Butir Soal
            </span>
            <span className="font-mono font-medium text-[var(--ink)] tabular-nums">
              {ujian.butir_list?.length ?? 0} butir
            </span>
          </div>

          <div className="py-2.5 flex justify-between items-center">
            <span className="text-xs text-[var(--ink-muted)] font-sans">
              Alokasi Waktu
            </span>
            <span className="font-mono font-medium text-[var(--ink)] tabular-nums">
              {ujian.durasi_menit} menit
            </span>
          </div>

          {ujian.waktu_mulai && (
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-xs text-[var(--ink-muted)] font-sans">
                Waktu Terbit
              </span>
              <span className="font-mono text-xs text-[var(--ink)] tabular-nums">
                {new Date(ujian.waktu_mulai).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          )}

          {ujian.waktu_selesai && (
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-xs text-[var(--ink-muted)] font-sans">
                Batas Pengumpulan
              </span>
              <span className="font-mono text-xs text-[var(--ink)] tabular-nums">
                {new Date(ujian.waktu_selesai).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 mb-6 text-xs leading-relaxed text-[#A4262C]">
          {error}
        </div>
      )}

      {ujian.status === "draft" && (
        <div className="border border-[var(--line)] bg-[var(--canvas)] p-6 mb-6">
          <h2 className="font-serif text-lg font-normal text-[var(--ink)] border-b border-[var(--line)] pb-2 mb-4">
            Jadwal Penerbitan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <Input
              label="Waktu Mulai"
              type="datetime-local"
              value={waktuMulai}
              onChange={(e) => setWaktuMulai(e.target.value)}
              helper="Peserta baru bisa masuk setelah waktu ini."
            />
            <Input
              label="Waktu Selesai"
              type="datetime-local"
              value={waktuSelesai}
              onChange={(e) => setWaktuSelesai(e.target.value)}
              helper="Jawaban dikumpulkan otomatis pada waktu ini."
            />
          </div>
          <label className="flex flex-col gap-1 max-w-sm mb-5">
            <span className="text-sm font-medium text-[var(--ink)]">Rilis Hasil ke Peserta</span>
            <select
              value={rilisHasil}
              onChange={(e) => setRilisHasil(e.target.value as "otomatis" | "manual")}
              className="bg-[var(--canvas)] text-[var(--ink)] border border-[var(--line-strong)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="otomatis">Otomatis setelah siswa mengumpulkan</option>
              <option value="manual">Manual: saya yang merilis</option>
            </select>
            <span className="text-xs text-[var(--ink-muted)]">
              {rilisHasil === "manual"
                ? "Siswa melihat pesan \"hasil belum dirilis\" sampai Anda merilisnya."
                : "Siswa langsung melihat skor dan kunci jawaban begitu mengumpulkan."}
            </span>
          </label>
          <Button onClick={handleTerbitkan} disabled={loading} size="lg">
            {loading ? "Menerbitkan..." : "Terbitkan Ujian & Generate Kode Akses"}
          </Button>
        </div>
      )}
    </div>
  );
}
