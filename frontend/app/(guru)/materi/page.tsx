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

const FORMAT_DIDUKUNG = /\.(pdf|docx|txt|md|text)$/i;
const MAKS_UKURAN_MB = 10;

function periksaBerkas(berkas: File): string | null {
  if (!FORMAT_DIDUKUNG.test(berkas.name)) {
    return "Format berkas tidak didukung. Gunakan PDF, DOCX, TXT, atau MD.";
  }
  if (berkas.size > MAKS_UKURAN_MB * 1024 * 1024) {
    return `Ukuran berkas melebihi batas ${MAKS_UKURAN_MB} MB.`;
  }
  return null;
}

export default function MateriPage() {
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
      const galat = periksaBerkas(berkas);
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
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Silakan pilih file materi terlebih dahulu.");
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
      setError(err.message || "Gagal mengunggah materi.");
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
        title="Materi Ajar"
        description="Dokumen rujukan kurikulum dan materi pembelajaran sebagai sumber penyusunan butir soal."
      />

      <section className="border border-[var(--line)] bg-[var(--surface)] p-6 mb-8 w-full rounded-md">
        <h2 className="font-serif text-lg font-normal text-[var(--ink)] mb-1">
          Unggah Materi Baru
        </h2>
        <p className="text-xs text-[var(--ink-muted)] mb-5">
          Teks materi akan dipecah secara semantik untuk referensi konteks agen AI.
        </p>

        <form onSubmit={handleUpload} className="flex flex-col gap-5">
          <Input
            label="Judul Materi Pembelajaran"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            placeholder="Contoh: Bab 3 - Dinamika Gerak dan Hukum Newton"
            helper="Tuliskan nama bab atau topik yang spesifik dan jelas"
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--ink)]">
              Berkas Naskah Materi
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
                  const galat = berkas ? periksaBerkas(berkas) : null;
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
                        ? "Lepaskan untuk memilih berkas ini"
                        : "Lepaskan berkas di mana saja pada halaman ini"}
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
                          Klik untuk memilih berkas atau seret ke sini
                        </span>
                      )}
                    </div>
                  </>
                )}
                <p className="text-xs text-[var(--ink-muted)]">
                  Format berkas: PDF (.pdf), Word (.docx), Teks (.txt, .md) UTF-8 · maks {MAKS_UKURAN_MB} MB
                </p>
              </div>
            </div>
            <span className="text-xs text-[var(--ink-muted)]">
              Berkas PDF dan DOCX otomatis dikonversi menjadi Markdown secara deterministik sebelum diindeks ke dalam potongan materi.
            </span>
          </div>

          {error && (
            <div className="p-2.5 text-xs leading-relaxed text-[#A4262C]">
              {error}
            </div>
          )}

          <div className="pt-2">
            <Button type="submit" disabled={loading} size="md">
              {loading ? "Menyimpan Berkas..." : "Unggah & Simpan Materi"}
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <h2 className="font-serif text-lg font-normal text-[var(--ink)] tracking-tight">
              Daftar Materi Terdaftar
            </h2>
            {!pageLoading && materiList.length > 0 && (
              <p className="text-xs text-[var(--ink-muted)] mt-0.5 font-mono tabular-nums">
                {materiList.length} dokumen tersimpan
              </p>
            )}
          </div>
        </div>

        {pageLoading ? (
          <SkeletonTable rows={3} cols={4} />
        ) : materiList.length === 0 ? (
          <EmptyState
            title="Belum ada materi pembelajaran"
            description="Unggah materi pertama melalui formulir di atas untuk mulai menyusun kisi-kisi dan butir soal."
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
                    Judul Materi
                  </th>
                  <th className="w-40 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] font-mono">
                    Tanggal Unggah
                  </th>
                  <th className="w-24 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] text-right">
                    Aksi
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
                      {new Date(item.created_at).toLocaleDateString("id-ID", {
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
                        Hapus
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
        title="Hapus Materi Ajar"
        description={`Materi "${deleteTarget?.judul}" beserta seluruh potongan teksnya akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus Permanen"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
