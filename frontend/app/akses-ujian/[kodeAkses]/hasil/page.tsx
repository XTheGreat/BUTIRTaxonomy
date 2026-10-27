"use client";

import { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import { Check, X } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api";
import { headerPeserta } from "@/lib/peserta";
import { HasilUjian } from "@/lib/types";
import MathText from "@/components/ui/MathText";
import { useTeks } from "@/lib/teks";

export default function HasilUjianPage({
  params,
}: {
  params: Promise<{ kodeAkses: string }>;
}) {
  const t = useTeks().ujian;
  const resolvedParams = use(params);
  const kodeAkses = resolvedParams.kodeAkses;
  const searchParams = useSearchParams();
  const namaSiswa = searchParams.get("nama") || "";

  const [hasil, setHasil] = useState<HasilUjian | null>(null);
  const [loading, setLoading] = useState(true);
  const [ditahan, setDitahan] = useState("");

  function muatHasil() {
    if (!namaSiswa) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch(
      `/api/siswa/ujian/${kodeAkses}/hasil?nama_siswa=${encodeURIComponent(namaSiswa)}`,
      { headers: headerPeserta(kodeAkses, namaSiswa) }
    )
      .then((data) => {
        setHasil(data);
        setDitahan("");
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 423) setDitahan(err.message);
      })
      .finally(() => setLoading(false));
  }

  useEffect(muatHasil, [kodeAkses, namaSiswa]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center p-4">
        <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono">
          {t.siswa.hasil.mengalkulasi}
        </div>
      </div>
    );
  }

  if (ditahan) {
    return (
      <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center p-4">
        <div className="border border-[var(--line-strong)] bg-[var(--surface)] p-8 text-center max-w-sm space-y-4">
          <span className="font-serif text-2xl font-medium tracking-tight text-[var(--ink)] block">{t.siswa.brand}</span>
          <p className="font-serif text-base text-[var(--ink)]">{t.siswa.hasil.sudahTerkumpul}</p>
          <p className="text-xs text-[var(--ink-muted)] leading-relaxed">{ditahan}</p>
          <button
            type="button"
            onClick={muatHasil}
            className="px-4 py-2 text-sm font-medium rounded border border-[var(--line-strong)] bg-[var(--canvas)] text-[var(--ink)] hover:border-[var(--ink)] transition-colors duration-[140ms]"
          >
            {t.siswa.hasil.muatUlang}
          </button>
        </div>
      </div>
    );
  }

  if (!hasil) {
    return (
      <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center p-4">
        <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono max-w-sm">
          {t.siswa.hasil.tidakDitemukan}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] py-8 px-4 sm:px-6">
      <div className="max-w-[680px] mx-auto">
        
        <div className="text-center pb-6 mb-8 border-b border-[var(--line)]">
          <span className="font-serif text-2xl font-medium tracking-tight text-[var(--ink)] block">
            {t.siswa.brand}
          </span>
          <span className="text-xs text-[var(--ink-muted)] block mt-0.5 font-sans">
            {t.siswa.hasil.lembarHasil}
          </span>
        </div>

        <div className="border border-[var(--line-strong)] bg-[var(--surface)] p-8 text-center mb-8">
          <span className="text-xs font-sans text-[var(--ink-muted)] block mb-1">
            {hasil.judul_ujian}
          </span>
          <div className="font-serif text-lg text-[var(--ink)] mb-4">
            {hasil.nama_siswa}
          </div>

          <div className="border-t border-b border-[var(--line)] py-4 my-3 max-w-[200px] mx-auto">
            <span className="text-xs font-sans text-[var(--ink-muted)] block mb-1">
              {t.siswa.hasil.skor}
            </span>
            <div className="font-serif text-5xl font-normal text-[var(--ink)] tabular-nums">
              {hasil.skor.toFixed(1)}
            </div>
          </div>

          <div className="font-mono text-xs text-[var(--ink-muted)] tabular-nums mt-2">
            {t.siswa.hasil.ringkasan(hasil.total_benar, hasil.total_soal)}
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-baseline justify-between border-b border-[var(--line)] pb-2">
            <h2 className="font-serif text-lg font-normal text-[var(--ink)]">
              {t.siswa.hasil.rincian}
            </h2>
            <span className="font-mono text-xs text-[var(--ink-muted)]">
              {t.siswa.hasil.jumlahButir(hasil.detail.length)}
            </span>
          </div>

          <div className="border border-[var(--line)] bg-[var(--canvas)] divide-y divide-[var(--line)]">
            {hasil.detail.map((item, idx) => (
              <div key={item.butir_id || idx} className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="font-mono text-xs text-[var(--ink-muted)] shrink-0 pt-0.5">
                    #{idx + 1}
                  </span>
                  <p className="font-serif text-sm text-[var(--ink)] leading-relaxed flex-1">
                    <MathText text={item.pertanyaan} />
                  </p>
                  <span className="shrink-0 pt-0.5">
                    {item.benar ? (
                      <Check
                        size={20}
                        strokeWidth={2.5}
                        className="text-[var(--status-diterima)]"
                        aria-label={t.siswa.hasil.benar}
                      />
                    ) : (
                      <X
                        size={20}
                        strokeWidth={2.5}
                        className="text-[var(--status-ditolak)]"
                        aria-label={t.siswa.hasil.salah}
                      />
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs font-mono text-[var(--ink-muted)] pt-2 mt-2 border-t border-[var(--line)]/50">
                  <span>
                    {t.siswa.hasil.jawabanPeserta}{" "}
                    <strong className="text-[var(--ink)]">
                      {item.jawaban_siswa || t.siswa.hasil.kosong}
                    </strong>
                  </span>
                  <span>
                    {t.siswa.hasil.kunci}{" "}
                    <strong className="text-[var(--status-diterima)]">
                      {item.kunci_jawaban}
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="text-center text-[11px] text-[var(--ink-muted)] font-mono pt-8 mt-8 border-t border-[var(--line)]">
          {t.siswa.hasil.tersimpan}
        </div>
      </div>
    </div>
  );
}
