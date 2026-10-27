"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ButirSoal } from "@/lib/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { useTeks } from "@/lib/teks";

const KUNCI = ["A", "B", "C", "D"];
const BLOOM = ["C1", "C2", "C3", "C4", "C5", "C6"];

interface EditButirDialogProps {
  butir: ButirSoal | null;
  mode?: "simpan" | "terima";
  onClose: () => void;
  onSaved: (butir: ButirSoal) => void;
}

export default function EditButirDialog({
  butir,
  mode = "simpan",
  onClose,
  onSaved,
}: EditButirDialogProps) {
  const t = useTeks().telaah.editButir;
  const [pertanyaan, setPertanyaan] = useState("");
  const [pilihan, setPilihan] = useState<Record<string, string>>({});
  const [kunci, setKunci] = useState("A");
  const [pembahasan, setPembahasan] = useState("");
  const [level, setLevel] = useState("C1");
  const [bobot, setBobot] = useState(1);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!butir) return;
    setPertanyaan(butir.pertanyaan || "");
    setPilihan({ A: "", B: "", C: "", D: "", ...(butir.pilihan || {}) });
    setKunci(butir.kunci_jawaban || "A");
    setPembahasan(butir.pembahasan || "");
    setLevel(butir.level_bloom || "C1");
    setBobot(butir.bobot_poin || 1);
    setError("");
  }, [butir]);

  useEffect(() => {
    if (!butir) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [butir, saving, onClose]);

  if (!butir) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!butir) return;
    if (!pertanyaan.trim()) {
      setError(t.pertanyaanKosong);
      return;
    }
    if (KUNCI.some((k) => !(pilihan[k] || "").trim())) {
      setError(t.opsiHarusDiisi);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        pertanyaan: pertanyaan.trim(),
        pilihan: Object.fromEntries(KUNCI.map((k) => [k, pilihan[k].trim()])),
        kunci_jawaban: kunci,
        pembahasan: pembahasan.trim(),
        level_bloom: level,
        bobot_poin: bobot,
      };
      if (mode === "terima") body.status = "diterima";
      const hasil = await apiFetch(`/api/butir/${butir.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      onSaved(hasil);
    } catch (err: any) {
      setError(err.message || t.gagalMenyimpan);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto py-6">
      <div
        className="fixed inset-0 bg-[var(--scrim)]"
        onClick={() => !saving && onClose()}
        aria-hidden="true"
      />
      <form
        onSubmit={handleSave}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-butir-judul"
        className="relative z-10 w-full max-w-2xl mx-4 max-h-[90dvh] overflow-y-auto bg-[var(--canvas)] border border-[var(--line)] rounded-md p-6 space-y-4"
        style={{ boxShadow: "var(--shadow-overlay)" }}
      >
        <div>
          <h2
            id="edit-butir-judul"
            className="font-serif text-lg font-normal text-[var(--ink)]"
          >
            {mode === "terima" ? t.judulTerima : t.judulEdit}
          </h2>
          <p className="text-xs text-[var(--ink-muted)] mt-0.5">
            {t.petunjukRumus}
          </p>
        </div>

        <Textarea
          label={t.pertanyaan}
          value={pertanyaan}
          onChange={(e) => setPertanyaan(e.target.value)}
          rows={4}
          autoResize
          className="font-serif"
        />

        <div className="space-y-2">
          <span className="text-sm font-medium text-[var(--ink)] block">
            {t.opsiJawaban}
          </span>
          {KUNCI.map((k) => (
            <div key={k} className="flex items-center gap-3">
              <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                <input
                  type="radio"
                  name="kunci"
                  checked={kunci === k}
                  onChange={() => setKunci(k)}
                  className="accent-[var(--accent)]"
                  aria-label={t.jadikanKunci(k)}
                />
                <span className="font-mono text-xs font-semibold w-4">{k}.</span>
              </label>
              <Input
                value={pilihan[k] || ""}
                onChange={(e) => setPilihan((prev) => ({ ...prev, [k]: e.target.value }))}
                aria-label={t.opsi(k)}
                className="font-serif"
              />
            </div>
          ))}
          <span className="text-xs text-[var(--ink-muted)] block">
            {t.petunjukKunci(kunci)}
          </span>
        </div>

        <Textarea
          label={t.pembahasan}
          value={pembahasan}
          onChange={(e) => setPembahasan(e.target.value)}
          rows={3}
          autoResize
          className="font-serif"
        />

        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[var(--ink)]">{t.levelBloom}</span>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="bg-[var(--canvas)] text-[var(--ink)] border border-[var(--line-strong)] rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-[var(--accent-text)]"
            >
              {BLOOM.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <Input
            label={t.bobotPoin}
            type="number"
            min={1}
            max={100}
            value={bobot}
            onChange={(e) => setBobot(Math.max(1, parseInt(e.target.value) || 1))}
            className="font-mono tabular-nums"
          />
        </div>

        {error && (
          <div className="p-2.5 text-xs leading-relaxed text-[var(--status-ditolak)]">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--line)]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            {t.batal}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving
              ? t.menyimpan
              : mode === "terima"
                ? t.simpanTerima
                : t.simpanPerubahan}
          </Button>
        </div>
      </form>
    </div>
  );
}
