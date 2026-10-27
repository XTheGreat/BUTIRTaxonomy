"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { GenerationStatus, KisiKisiRingkas } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import BloomChip from "@/components/ui/BloomChip";
import RondeIndicator from "@/components/ui/RondeIndicator";
import TigaTitik from "@/components/ui/TigaTitik";
import MathText from "@/components/ui/MathText";
import BatangBloom from "@/components/ui/BatangBloom";
import { formatWaktu } from "@/lib/format";
import { Loader2 } from "lucide-react";
import { useTeks } from "@/lib/teks";

const sedangBerjalan = (status: string) =>
  status === "draft" || status === "debating";

function renderRondePip(ronde: number, maxRonde = 3) {
  return <RondeIndicator ronde={ronde} maxRonde={maxRonde} />;
}

export default function GenerasiPage() {
  const tg = useTeks().persiapan.generasi;
  const params = useParams();
  const kisiKisiId = params.kisiKisiId as string;
  const [status, setStatus] = useState<GenerationStatus | null>(null);
  const baruDimulai = useSearchParams().get("mulai") === "1";
  const [diperiksa, setDiperiksa] = useState(false);
  const [kisi, setKisi] = useState<KisiKisiRingkas | null>(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    apiFetch("/api/kisi-kisi")
      .then((daftar: KisiKisiRingkas[]) => setKisi(daftar.find((k) => k.id === kisiKisiId) ?? null))
      .catch(() => {});
  }, [kisiKisiId]);

  const loadStatus = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/kisi-kisi/${kisiKisiId}/status`);
      setStatus(data);
      return data;
    } catch {
      return null;
    }
  }, [kisiKisiId]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      const data = await loadStatus();
      if (data && data.total > 0) {
        if (!data.items.some((item: { status: string }) => sedangBerjalan(item.status))) {
          setPolling(false);
          try {
            localStorage.removeItem("butir_active_generation");
            window.dispatchEvent(new Event("generation_status_changed"));
          } catch {}
        } else {
          try {
            localStorage.setItem("butir_active_generation", JSON.stringify({ id: kisiKisiId }));
            window.dispatchEvent(new Event("generation_status_changed"));
          } catch {}
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [polling, loadStatus, kisiKisiId]);

  useEffect(() => {
    let attempts = 0;
    const checkInitial = async () => {
      const data = await loadStatus();
      if (data && data.total > 0) {
        setDiperiksa(true);
        if (data.items.some((item: { status: string }) => sedangBerjalan(item.status))) {
          setPolling(true);
          try {
            localStorage.setItem("butir_active_generation", JSON.stringify({ id: kisiKisiId }));
            window.dispatchEvent(new Event("generation_status_changed"));
          } catch {}
        } else {
          try {
            localStorage.removeItem("butir_active_generation");
            window.dispatchEvent(new Event("generation_status_changed"));
          } catch {}
        }
      } else if (attempts < (baruDimulai ? 40 : 3)) {
        attempts++;
        setTimeout(checkInitial, baruDimulai ? 1500 : 1000);
      } else {
        setDiperiksa(true);
      }
    };
    checkInitial();
  }, [loadStatus, kisiKisiId, baruDimulai]);

  const jumlahDiproses = status
    ? status.items.filter((item) => !sedangBerjalan(item.status)).length
    : 0;
  const jumlahTertunda = status
    ? status.items.filter((item) => item.status === "tertunda").length
    : 0;

  const isComplete = !!status && status.total > 0 && jumlahDiproses === status.total;

  const progressPercent =
    status && status.total > 0
      ? Math.round((jumlahDiproses / status.total) * 100)
      : 0;

  return (
    <div>
      <PageHeader
        title={tg.judul}
        description={tg.deskripsi}
        action={
          isComplete ? (
            <div className="flex gap-2">
              <Link href="/butir-ditandai">
                <Button variant="secondary" size="sm">
                  {tg.butirDitandai}
                </Button>
              </Link>
              <Link href="/bank-soal">
                <Button size="sm">{tg.bukaBankSoal}</Button>
              </Link>
            </div>
          ) : undefined
        }
      />

      {!(status && status.total > 0) && !baruDimulai && !diperiksa && (
        <p className="font-mono text-xs text-[var(--ink-muted)]">{tg.memuat}</p>
      )}

      {!(status && status.total > 0) && !baruDimulai && diperiksa && (
        <div className="border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-6 max-w-xl rounded-lg">
          <h2 className="font-serif text-lg font-normal text-[var(--ink)] mb-2">{tg.belumDijalankan.judul}</h2>
          <p className="text-xs text-[var(--ink-muted)] mb-5 leading-relaxed">
            {tg.belumDijalankan.deskripsi}
          </p>
          <Link href="/kisi-kisi#kisi-tersimpan">
            <Button size="md">{tg.belumDijalankan.tombol}</Button>
          </Link>
        </div>
      )}

      {!(status && status.total > 0) && baruDimulai && (
        <div className="border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-6 max-w-xl rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)] shrink-0" />
            <h2 className="font-serif text-lg font-normal text-[var(--ink)]">
              {tg.mempersiapkan.judul}
            </h2>
          </div>
          <p className="text-xs text-[var(--ink-muted)] leading-relaxed mb-4">
            {tg.mempersiapkan.deskripsi}
          </p>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--ink-muted)]">
            <TigaTitik />
            <span>{tg.mempersiapkan.menunggu}</span>
          </div>
        </div>
      )}

      {status && status.total > 0 && (
        <div className="space-y-6">
          
          <div className="border border-[var(--line)] bg-[var(--surface)] p-5 rounded-lg">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="font-serif text-sm font-normal text-[var(--ink)]">
                {tg.progres.diproses(jumlahDiproses, status.total)}{" "}
                <span className="font-sans text-xs text-[var(--ink-muted)]">({progressPercent}%)</span>
              </div>
              {polling ? (
                <div className="text-[var(--accent)] font-sans text-xs font-medium">
                  {tg.progres.sinkronisasi}
                </div>
              ) : (
                <div className="font-sans text-[#1F6B3A] text-xs font-medium">
                  {tg.progres.selesai}
                </div>
              )}
            </div>

            <div className="w-full bg-[var(--line)] h-1 overflow-hidden rounded-full">
              <div
                className="bg-[var(--accent)] h-1 transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {polling && (
              <p className="mt-3 text-[11px] text-[var(--ink-muted)] leading-relaxed">
                {tg.progres.catatanLatarBelakang}
              </p>
            )}

            {jumlahTertunda > 0 && (
              <div className="mt-4 pt-3 border-t border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-[var(--ink-muted)] leading-relaxed">
                  {tg.progres.tertundaAwal(jumlahTertunda)} <span className="font-mono text-[var(--ink)]">{tg.progres.tertundaKata}</span> {tg.progres.tertundaAkhir}
                </div>
                <Link href="/butir-tertunda" className="shrink-0">
                  <Button size="sm" variant="secondary" className="text-xs">
                    {tg.progres.bukaButirTertunda}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="w-full overflow-x-auto border border-[var(--line)] bg-[var(--canvas)] rounded-lg">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm table-fixed">
              <thead>
                <tr className="bg-[var(--surface)] border-b border-[var(--line)]">
                  <th className="w-12 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] font-mono">
                    #
                  </th>
                  <th className="w-20 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                    {tg.tabel.bloom}
                  </th>
                  <th className="w-28 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                    {tg.tabel.status}
                  </th>
                  <th className="w-44 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                    {tg.tabel.ronde}
                  </th>
                  <th className="px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                    {tg.tabel.keteranganNaskah}
                  </th>
                  <th className="w-44 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                    {tg.tabel.debat}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {status.items.map((item, i) => (
                  <tr
                    key={item.id || i}
                    className="h-14 align-middle hover:bg-[var(--surface)]/60 transition-colors duration-140"
                  >
                    <td className="px-3 py-2 font-mono text-xs text-[var(--ink-muted)] tabular-nums">
                      {i + 1}
                    </td>
                    <td className="px-3 py-2">
                      <BloomChip level={item.level_bloom} />
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-3 py-2">
                      {renderRondePip(item.ronde_saat_ini)}
                    </td>
                    <td className="px-3 py-2 text-xs leading-snug text-[var(--ink)] font-serif">
                      {item.pertanyaan ? (
                        <span className="line-clamp-2 break-words">
                          <MathText text={item.pertanyaan} gulir={false} />
                        </span>
                      ) : (
                        <span className="text-[var(--ink-muted)] font-sans italic">
                          {tg.tabel.menungguGiliran}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {item.id && (
                        <Link
                          href={`/debat/${item.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                        >
                          {sedangBerjalan(item.status) && <TigaTitik className="!gap-1 [&>span]:!h-1 [&>span]:!w-1" />}
                          {tg.tabel.lihatDebatLive}
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {kisi && (
        <section aria-label={tg.kisi.ariaLabel} className="mt-8 border border-[var(--line)] bg-[var(--surface)] p-5 rounded-lg">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--line)] pb-2">
            <h2 className="font-serif text-lg font-normal text-[var(--ink)]">{tg.kisi.judul}</h2>
            <span className="font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">{formatWaktu(kisi.created_at)}</span>
          </div>
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[var(--ink-muted)]">{tg.kisi.nama}</dt>
              <dd className="font-serif text-[var(--ink)]">{kisi.nama || tg.kisi.tanpaNama}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--ink-muted)]">{tg.kisi.jumlahButir}</dt>
              <dd className="font-mono tabular-nums text-[var(--ink)]">{kisi.jumlah_butir}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-[var(--ink-muted)]">{tg.kisi.materiRujukan}</dt>
              <dd className="font-serif text-[var(--ink)]">
                {kisi.materi.length > 0 ? kisi.materi.map((m) => m.judul).join(", ") : tg.kisi.tanpaMateri}
              </dd>
            </div>
            {kisi.cakupan_bab && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-[var(--ink-muted)]">{tg.kisi.cakupanBab}</dt>
                <dd className="font-serif text-[var(--ink)]">{kisi.cakupan_bab}</dd>
              </div>
            )}
            <div className="sm:col-span-2">
              <dt className="mb-1.5 text-xs text-[var(--ink-muted)]">{tg.kisi.distribusiBloom}</dt>
              <dd>
                <BatangBloom bloom={kisi.distribusi_bloom} />
              </dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  );
}
