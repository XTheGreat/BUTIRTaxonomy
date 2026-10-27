"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { ambilToken, headerPeserta, simpanToken } from "@/lib/peserta";
import { SoalUjian } from "@/lib/types";
import Button from "@/components/ui/Button";
import MathText from "@/components/ui/MathText";
import { useTeks } from "@/lib/teks";

export default function UjianSiswaPage({
  params,
}: {
  params: Promise<{ kodeAkses: string }>;
}) {
  const t = useTeks().ujian;
  const resolvedParams = use(params);
  const kodeAkses = resolvedParams.kodeAkses;
  const router = useRouter();

  const [step, setStep] = useState<"login" | "ujian">("login");
  const [namaSiswa, setNamaSiswa] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [soalList, setSoalList] = useState<SoalUjian[]>([]);
  const [jawaban, setJawaban] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [judulUjian, setJudulUjian] = useState("");
  const [waktuSelesai, setWaktuSelesai] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [galatSimpan, setGalatSimpan] = useState("");

  async function handleMasuk(e: React.FormEvent) {
    e.preventDefault();
    if (!namaSiswa.trim()) {
      setError(t.siswa.isiNama);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/siswa/masuk", {
        method: "POST",
        body: JSON.stringify({
          kode_akses: kodeAkses,
          nama_siswa: namaSiswa,
          token: ambilToken(kodeAkses, namaSiswa),
        }),
      });
      const nama: string = res.nama_siswa;
      setNamaSiswa(nama);
      if (res.token_peserta) simpanToken(kodeAkses, nama, res.token_peserta);
      setJudulUjian(res.judul_ujian);
      if (res.waktu_selesai) {
        setWaktuSelesai(new Date(res.waktu_selesai));
      }

      const soalData = await apiFetch(
        `/api/siswa/ujian/${kodeAkses}/soal?nama_siswa=${encodeURIComponent(nama)}`,
        { headers: headerPeserta(kodeAkses, nama) }
      );
      setSoalList(soalData.soal || []);
      setJawaban(soalData.jawaban_tersimpan || {});
      setStep("ujian");
    } catch (err: any) {
      setError(err.message || t.siswa.kodeTidakValid);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = useCallback(async () => {
    if (submitted) return;
    setSubmitted(true);
    setShowConfirmModal(false);
    try {
      await apiFetch(
        `/api/siswa/ujian/${kodeAkses}/submit?nama_siswa=${encodeURIComponent(
          namaSiswa
        )}`,
        { method: "POST", headers: headerPeserta(kodeAkses, namaSiswa) }
      );
      router.push(
        `/akses-ujian/${kodeAkses}/hasil?nama=${encodeURIComponent(namaSiswa)}`
      );
    } catch (err: any) {
      setError(err.message || t.siswa.galatKumpul);
      setSubmitted(false);
    }
  }, [kodeAkses, namaSiswa, submitted, router, t]);

  useEffect(() => {
    if (step !== "ujian" || !waktuSelesai || submitted) return;
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((waktuSelesai.getTime() - Date.now()) / 1000)
      );
      setTimeLeft(remaining);
      if (remaining <= 0) {
        handleSubmit();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [step, waktuSelesai, submitted, handleSubmit]);

  async function saveJawaban(butirId: string, pilihan: string) {
    setJawaban((prev) => ({ ...prev, [butirId]: pilihan }));
    try {
      await apiFetch(
        `/api/siswa/ujian/${kodeAkses}/jawab?nama_siswa=${encodeURIComponent(
          namaSiswa
        )}`,
        {
          method: "POST",
          headers: headerPeserta(kodeAkses, namaSiswa),
          body: JSON.stringify({ butir_id: butirId, jawaban_pilihan: pilihan }),
        }
      );
      setGalatSimpan("");
    } catch (err: any) {
      setGalatSimpan(
        err?.message ? t.siswa.belumTersimpanDengan(err.message) : t.siswa.belumTersimpan
      );
    }
  }

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const totalTerjawab = Object.keys(jawaban).filter((k) => jawaban[k]).length;
  const totalBelumDijawab = soalList.length - totalTerjawab;

  if (step === "login") {
    return (
      <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center p-4">
        <div className="w-full max-w-sm border border-[var(--line)] bg-[var(--surface)] p-8">
          <div className="text-center mb-6">
            <span className="font-serif text-2xl font-medium tracking-tight text-[var(--ink)] block">
              {t.siswa.brand}
            </span>
            <span className="text-xs text-[var(--ink-muted)] block mt-0.5 font-sans">
              {t.siswa.lembarPengerjaan}
            </span>
          </div>

          <div className="border border-[var(--line)] bg-[var(--canvas)] p-3 text-center mb-5">
            <span className="text-xs font-sans text-[var(--ink-muted)] block mb-1">
              {t.siswa.kodeAksesNaskah}
            </span>
            <span className="font-mono text-2xl font-bold tracking-[0.2em] text-[var(--ink)] block pl-[0.2em]">
              {kodeAkses}
            </span>
          </div>

          <form onSubmit={handleMasuk} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="nama"
                className="text-xs font-medium text-[var(--ink)] font-sans"
              >
                {t.siswa.namaLengkap}
              </label>
              <input
                id="nama"
                type="text"
                value={namaSiswa}
                onChange={(e) => setNamaSiswa(e.target.value)}
                placeholder={t.siswa.placeholderNama}
                className="bg-[var(--canvas)] border border-[var(--line-strong)] rounded px-3 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]/60 focus:outline-none focus:border-[var(--accent)]"
                autoComplete="name"
                required
              />
            </div>

            {error && (
              <div className="p-2.5 text-xs leading-relaxed text-[#A4262C]">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] mt-2 text-sm"
            >
              {loading ? t.siswa.menyiapkan : t.siswa.mulai}
            </Button>
          </form>

          <p className="text-[11px] text-[var(--ink-muted)] text-center mt-6">
            {t.siswa.koneksi}
          </p>
        </div>
      </div>
    );
  }

  const currentSoal = soalList[currentIdx];

  const timerClass =
    timeLeft !== null && timeLeft <= 60
      ? "text-[#A4262C] border-[#A4262C]/40 bg-[#FBEAEA]"
      : timeLeft !== null && timeLeft <= 300
      ? "text-[#8A5A00] border-[#8A5A00]/40 bg-[#FBF1D9]"
      : "text-[var(--ink)] border-[var(--line)] bg-[var(--surface)]";

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] flex flex-col">
      
      <header className="sticky top-0 z-30 bg-[var(--canvas)] border-b border-[var(--line)] px-4 py-2.5 sm:px-6">
        <div className="max-w-[680px] mx-auto flex items-center justify-between">
          <div className="min-w-0 pr-3">
            <h1 className="font-serif text-sm sm:text-base font-normal text-[var(--ink)] truncate">
              {judulUjian}
            </h1>
            <span className="text-[11px] text-[var(--ink-muted)] block truncate">
              {namaSiswa}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {timeLeft !== null && (
              <div
                className={`font-mono text-xs font-semibold px-2.5 py-1 rounded border tabular-nums ${timerClass}`}
                aria-label={t.siswa.sisaWaktu(formatTimer(timeLeft))}
              >
                {formatTimer(timeLeft)}
              </div>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowConfirmModal(true)}
              className="text-xs min-h-[36px]"
            >
              {t.siswa.kumpulkan}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[680px] w-full mx-auto px-4 py-6 sm:py-8 flex flex-col">
        {galatSimpan && (
          <div
            role="alert"
            className="mb-4 text-xs leading-relaxed text-[#A4262C]"
          >
            {galatSimpan} {t.siswa.pilihUlang}
          </div>
        )}
        
        <div className="mb-6 pb-4 border-b border-[var(--line)]">
          <div className="flex items-center justify-between text-xs text-[var(--ink-muted)] mb-2.5 font-mono">
            <span>{t.siswa.daftarButir}</span>
            <span className="tabular-nums">
              {t.siswa.terjawabDari(totalTerjawab, soalList.length)}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {soalList.map((s, idx) => {
              const isCurrent = idx === currentIdx;
              const hasAnswer = Boolean(jawaban[s.id]);

              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded text-xs font-mono font-medium flex items-center justify-center transition-colors relative ${
                    isCurrent
                      ? "border-2 border-[var(--ink)] bg-[var(--surface)] text-[var(--ink)] font-bold"
                      : hasAnswer
                      ? "border border-[var(--line)] bg-[var(--canvas)] text-[var(--ink)]"
                      : "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)]"
                  }`}
                  aria-label={t.siswa.soalNomor(idx + 1, hasAnswer)}
                >
                  <span className="tabular-nums">{idx + 1}</span>
                  {hasAnswer && !isCurrent && (
                    <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {currentSoal && (
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 text-xs font-mono text-[var(--ink-muted)]">
                <span>
                  {t.siswa.butirKe(currentIdx + 1, soalList.length)}
                </span>
                <span>{t.siswa.pilihanGanda}</span>
              </div>

              <div className="mb-6 sm:mb-8">
                <p className="font-serif text-[18px] sm:text-[20px] text-[var(--ink)] leading-relaxed">
                  <MathText text={currentSoal.pertanyaan} />
                </p>
              </div>

              <div className="space-y-2.5 mb-8">
                {Object.entries(currentSoal.pilihan || {}).map(([key, val]) => {
                  const isSelected = jawaban[currentSoal.id] === key;

                  return (
                    <button
                      key={key}
                      onClick={() => saveJawaban(currentSoal.id, key)}
                      aria-pressed={isSelected}
                      className="w-full min-h-[52px] p-3 rounded flex items-center justify-between gap-3 text-left transition-colors duration-140 border border-[var(--line-strong)] bg-[var(--canvas)] hover:bg-[var(--surface)] text-[var(--ink)]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        
                        <span
                          className={`w-7 h-7 shrink-0 rounded flex items-center justify-center font-mono text-xs font-semibold border ${
                            isSelected
                              ? "bg-[var(--ink)] text-white border-[var(--ink)]"
                              : "bg-[var(--surface)] text-[var(--ink)] border-[var(--line-strong)]"
                          }`}
                        >
                          {key}
                        </span>
                        
                        <span className="font-serif text-base sm:text-lg leading-normal">
                          <MathText text={val} />
                        </span>
                      </div>

                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-6 border-t border-[var(--line)] flex items-center justify-between">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
                disabled={currentIdx === 0}
                className="min-h-[44px]"
              >
                {t.siswa.sebelumnya}
              </Button>

              {currentIdx < soalList.length - 1 ? (
                <Button
                  size="md"
                  onClick={() =>
                    setCurrentIdx((p) => Math.min(soalList.length - 1, p + 1))
                  }
                  className="min-h-[44px]"
                >
                  {t.siswa.selanjutnya}
                </Button>
              ) : (
                <Button
                  size="md"
                  variant="primary"
                  onClick={() => setShowConfirmModal(true)}
                  className="min-h-[44px]"
                >
                  {t.siswa.selesaiKumpulkan}
                </Button>
              )}
            </div>
          </div>
        )}
      </main>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/40 p-4">
          <div
            className="w-full max-w-md bg-[var(--canvas)] border border-[var(--line)] p-6 rounded"
            style={{ boxShadow: "var(--shadow-overlay)" }}
          >
            <h2 className="font-serif text-xl font-normal text-[var(--ink)] mb-2">
              {t.siswa.konfirmasi.judul}
            </h2>

            <div className="border border-[var(--line)] bg-[var(--surface)] p-3.5 my-4 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-[var(--ink-muted)]">{t.siswa.konfirmasi.soalTerjawab}</span>
                <span className="font-medium text-[var(--ink)] tabular-nums">
                  {t.siswa.konfirmasi.terjawabDari(totalTerjawab, soalList.length)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink-muted)]">{t.siswa.konfirmasi.belumTerjawab}</span>
                <span
                  className={`font-medium tabular-nums ${
                    totalBelumDijawab > 0 ? "text-[#A4262C]" : "text-[#1F6B3A]"
                  }`}
                >
                  {t.siswa.konfirmasi.butir(totalBelumDijawab)}
                </span>
              </div>
            </div>

            {totalBelumDijawab > 0 ? (
              <p className="text-xs text-[#8A5A00] mb-5 leading-relaxed">
                {t.siswa.konfirmasi.peringatan(totalBelumDijawab)}
              </p>
            ) : (
              <p className="text-xs text-[var(--ink-muted)] mb-5 leading-relaxed">
                {t.siswa.konfirmasi.semuaTerisi}
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
              >
                {t.siswa.konfirmasi.lanjutkan}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={submitted}
              >
                {submitted ? t.siswa.konfirmasi.mengirim : t.siswa.konfirmasi.ya}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
