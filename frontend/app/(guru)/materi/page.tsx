"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Materi } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { SkeletonTable } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { Upload } from "lucide-react";
import { useBahasa, useTeks } from "@/lib/teks";
import type { Kamus } from "@/lib/teks";

const FORMAT_DIDUKUNG = /\.(pdf|docx|txt|md|text)$/i;
const MAKS_UKURAN_MB = 10;

function periksaBerkas(berkas: File, t: Kamus): string | null {
  if (!FORMAT_DIDUKUNG.test(berkas.name)) {
    return t.persiapan.materi.formatTidakDidukung;
  }
  if (berkas.size > MAKS_UKURAN_MB * 1024 * 1024) {
    return t.persiapan.materi.ukuranMelebihi(MAKS_UKURAN_MB);
  }
  return null;
}

export default function MateriPage() {
  const t = useTeks();
  const { bahasa } = useBahasa();
  const tm = t.persiapan.materi;
  const [materiList, setMateriList] = useState<Materi[]>([]);
  const [judul, setJudul] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Materi | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dragDiHalaman, setDragDiHalaman] = useState(false);
  const [dragDiZona, setDragDiZona] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadMateri() {
    try {
      const data = await apiFetch("/api/materi");
      setMateriList(Array.isArray(data) ? data : []);
    } catch {}
    finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    loadMateri();
  }, []);

  useEffect(() => {
    let kedalaman = 0;
    const membawaBerkas = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types || []).includes("Files");

    const terimaBerkas = (daftar?: FileList | null) => {
      const berkas = daftar?.[0];
      if (!berkas) return;
      const galat = periksaBerkas(berkas, t);
      if (galat) {
        setError(galat);
        return;
      }
      setError("");
      setFile(berkas);
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(berkas);
        fileInputRef.current.files = dt.files;
      }
    };

    const masuk = (e: DragEvent) => {
      if (!membawaBerkas(e)) return;
      kedalaman++;
      setDragDiHalaman(true);
    };
    const lewat = (e: DragEvent) => {
      if (!membawaBerkas(e)) return;
      e.preventDefault();
    };
    const keluar = (e: DragEvent) => {
      if (!membawaBerkas(e)) return;
      kedalaman = Math.max(0, kedalaman - 1);
      if (kedalaman === 0) {
        setDragDiHalaman(false);
        setDragDiZona(false);
      }
    };
    const lepas = (e: DragEvent) => {
      if (!membawaBerkas(e)) return;
      e.preventDefault();
      kedalaman = 0;
      setDragDiHalaman(false);
      setDragDiZona(false);
      terimaBerkas(e.dataTransfer?.files);
    };

    window.addEventListener("dragenter", masuk);
    window.addEventListener("dragover", lewat);
    window.addEventListener("dragleave", keluar);
    window.addEventListener("drop", lepas);
    return () => {
      window.removeEventListener("dragenter", masuk);
      window.removeEventListener("dragover", lewat);
      window.removeEventListener("dragleave", keluar);
      window.removeEventListener("drop", lepas);
    };
  }, [t]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError(tm.pilihBerkasDulu);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("judul", judul);
      formData.append("file", file);
      await apiFetch("/api/materi", {
        method: "POST",
        body: formData,
      });
      setJudul("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadMateri();
    } catch (err: any) {
      setError(err.message || tm.gagalUnggah);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/materi/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await loadMateri();
    } catch {
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={tm.judul}
        description={tm.deskripsi}
      />

      <section className="border border-[var(--line)] bg-[var(--surface)] p-6 mb-8 w-full rounded-md">
        <h2 className="font-serif text-lg font-normal text-[var(--ink)] mb-1">
          {tm.unggah.judul}
        </h2>
        <p className="text-xs text-[var(--ink-muted)] mb-5">
          {tm.unggah.keterangan}
        </p>

        <form onSubmit={handleUpload} className="flex flex-col gap-5">
          <Input
            label={tm.unggah.labelJudul}
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            placeholder={tm.unggah.placeholderJudul}
            helper={tm.unggah.bantuanJudul}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--ink)]">
              {tm.unggah.labelBerkas}
            </label>
            <div
              onDragOver={() => setDragDiZona(true)}
              onDragLeave={() => setDragDiZona(false)}
              className={`relative min-h-[280px] flex items-center justify-center rounded border px-6 py-12 text-center transition-colors duration-[140ms] ease-out group cursor-pointer ${
                dragDiZona
                  ? "border-solid border-[var(--accent)] bg-[var(--accent-soft)]"
                  : dragDiHalaman
                  ? "border-dashed border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-dashed border-[var(--line-strong)] bg-[var(--canvas)] hover:border-[var(--accent)]"
              }`}
            >
              <input
                ref={fileInputRef}
                id="file-input"
                type="file"
                accept=".txt,.md,.text,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => {
                  const berkas = e.target.files?.[0] || null;
                  const galat = berkas ? periksaBerkas(berkas, t) : null;
                  if (galat) {
                    setError(galat);
                    e.target.value = "";
                    setFile(null);
                    return;
                  }
                  setError("");
                  setFile(berkas);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                required
              />
              <div className="pointer-events-none flex flex-col items-center gap-3">
                {dragDiHalaman || dragDiZona ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                    <div className="font-serif text-lg text-[var(--accent)]">
                      {dragDiZona
                        ? tm.unggah.lepasDiZona
                        : tm.unggah.lepasDiHalaman}
                    </div>
                  </>
                ) : (
                  <>
                    <Upload
                      size={28}
                      strokeWidth={1.5}
                      className="text-[var(--ink-muted)] group-hover:text-[var(--accent)] transition-colors duration-[140ms]"
                    />
                    <div className="text-sm text-[var(--ink)]">
                      {file ? (
                        <span className="font-medium text-[var(--accent)]">
                          {file.name} ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      ) : (
                        <span className="group-hover:text-[var(--accent)] transition-colors duration-[140ms]">
                          {tm.unggah.klikAtauSeret}
                        </span>
                      )}
                    </div>
                  </>
                )}
                <p className="text-xs text-[var(--ink-muted)]">
                  {tm.unggah.formatBerkas(MAKS_UKURAN_MB)}
                </p>
              </div>
            </div>
            <span className="text-xs text-[var(--ink-muted)]">
              {tm.unggah.catatanKonversi}
            </span>
          </div>

          {error && (
            <div className="p-2.5 text-xs leading-relaxed text-[#A4262C]">
              {error}
            </div>
          )}

          <div className="pt-2">
            <Button type="submit" disabled={loading} size="md">
              {loading ? tm.unggah.menyimpan : tm.unggah.tombolUnggah}
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="font-serif text-lg font-normal text-[var(--ink)] tracking-tight">
              {tm.daftar.judul}
            </h2>
            {!pageLoading && materiList.length > 0 && (
              <p className="text-xs text-[var(--ink-muted)] mt-0.5 font-mono tabular-nums">
                {tm.daftar.jumlahDokumen(materiList.length)}
              </p>
            )}
          </div>
        </div>

        {pageLoading ? (
          <SkeletonTable rows={3} cols={4} />
        ) : materiList.length === 0 ? (
          <EmptyState
            title={tm.daftar.kosongJudul}
            description={tm.daftar.kosongDeskripsi}
          />
        ) : (
          <div className="border border-[var(--line)] bg-[var(--canvas)] overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--surface)] border-b border-[var(--line)]">
                <tr>
                  <th className="w-12 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] font-mono">
                    #
                  </th>
                  <th className="px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                    {tm.daftar.kolomJudul}
                  </th>
                  <th className="w-40 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] font-mono">
                    {tm.daftar.kolomTanggal}
                  </th>
                  <th className="w-24 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] text-right">
                    {tm.daftar.kolomAksi}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {materiList.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[var(--surface)]/60 transition-colors duration-[140ms]"
                  >
                    <td className="px-3 py-2.5 font-mono text-xs text-[var(--ink-muted)] tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-medium text-[var(--ink)]">
                        {item.judul}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-[var(--ink-muted)]">
                      {new Date(item.created_at).toLocaleDateString(bahasa === "en" ? "en-US" : "id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="text-xs text-[var(--ink-muted)] hover:text-[#A4262C] transition-colors duration-[140ms] underline focus-visible:outline-none"
                      >
                        {t.persiapan.umum.hapus}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!deleteTarget}
        title={tm.hapusDialog.judul}
        description={tm.hapusDialog.deskripsi(deleteTarget?.judul)}
        confirmLabel={tm.hapusDialog.konfirmasi}
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
