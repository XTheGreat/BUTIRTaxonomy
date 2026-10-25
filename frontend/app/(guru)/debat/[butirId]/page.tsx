"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { ArsipSoal, DebatLive, PesanDebat } from "@/lib/types";
import { ringkasPenyebab } from "@/lib/penyebabTertunda";
import PageHeader from "@/components/ui/PageHeader";
import BloomChip from "@/components/ui/BloomChip";
import RondeIndicator from "@/components/ui/RondeIndicator";
import StatusBadge from "@/components/ui/StatusBadge";
import PipMeter from "@/components/ui/PipMeter";
import TigaTitik from "@/components/ui/TigaTitik";
import Ketik, { AnimasiKetik } from "@/components/ui/Ketik";
import Button from "@/components/ui/Button";

const JEDA_MS = 2500;

const AGEN: Record<string, { nama: string; kegiatan: string }> = {
  penyusun: { nama: "Penyusun", kegiatan: "sedang menyusun draf soal" },
  kritikus: { nama: "Kritikus", kegiatan: "sedang menelaah soal" },
  penjawab_buta: { nama: "Penjawab Buta", kegiatan: "sedang menjawab tanpa melihat kunci" },
  arbiter: { nama: "Arbiter", kegiatan: "sedang menimbang dan memutuskan" },
};

const VERDICT: Record<string, { label: string; warna: string }> = {
  diterima: { label: "Diterima", warna: "#1F6B3A" },
  revisi: { label: "Perlu revisi", warna: "#8A5A00" },
  ditolak: { label: "Ditolak", warna: "#A4262C" },
};

const prosesBerjalan = (status: string) => status === "draft" || status === "debating";

function daftarNama(agen: string[]) {
  const nama = agen.map((a) => AGEN[a]?.nama ?? a);
  return nama.length > 1 ? `${nama.slice(0, -1).join(", ")} dan ${nama[nama.length - 1]}` : nama[0];
}

function Kotak({ agen, children }: { agen: string; children: React.ReactNode }) {
  return (
    <article className="pesan-muncul border border-[var(--line)] bg-[var(--canvas)] rounded-md">
      <header className="flex items-center gap-2 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-2">
        <span aria-hidden="true" className="h-2 w-2 bg-[var(--accent)]" />
        <span className="font-serif text-sm font-medium text-[var(--ink)]">{AGEN[agen]?.nama ?? agen}</span>
      </header>
      <div className="px-4 py-3">{children}</div>
    </article>
  );
}

function IsiPenyusun({ o }: { o: Record<string, any> }) {
  const kunci = o.kunci_jawaban;
  return (
    <div className="space-y-3">
      <p className="font-serif text-[15px] leading-relaxed text-[var(--ink)]">
        <Ketik text={o.pertanyaan || ""} />
      </p>
      <ul className="space-y-1">
        {Object.entries((o.pilihan as Record<string, string>) || {}).map(([k, v], i) => (
          <li key={k} className={`flex gap-3 text-sm ${k === kunci ? "font-medium text-[#1F6B3A]" : "text-[var(--ink)]"}`}>
            <span className="w-5 shrink-0 font-mono text-xs font-semibold pt-0.5">{k}.</span>
            <span className="font-serif">
              <Ketik text={String(v)} tunda={120 * (i + 1)} />
            </span>
          </li>
        ))}
      </ul>
      {o.pembahasan && (
        <p className="border-t border-[var(--line)] pt-2 text-xs leading-relaxed text-[var(--ink-muted)] font-serif">
          <span className="font-sans font-semibold text-[var(--ink)]">Pembahasan: </span>
          <Ketik text={o.pembahasan} tunda={600} />
        </p>
      )}
    </div>
  );
}

function IsiKritikus({ o }: { o: Record<string, any> }) {
  return (
    <div className="space-y-3">
      {o.skor_rubrik && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {Object.entries(o.skor_rubrik as Record<string, number>).map(([k, v]) => (
            <PipMeter
              key={k}
              label={k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              score={typeof v === "number" ? v : 3}
              maxScore={5}
            />
          ))}
        </div>
      )}
      {o.catatan_kritik && (
        <p className="font-serif text-sm leading-relaxed text-[var(--ink)]">
          <span className="font-sans text-xs font-semibold text-[var(--ink-muted)] block mb-0.5">Catatan</span>
          <Ketik text={o.catatan_kritik} />
        </p>
      )}
      {o.usulan_perbaikan && (
        <p className="font-serif text-sm leading-relaxed text-[var(--ink)]">
          <span className="font-sans text-xs font-semibold text-[var(--ink-muted)] block mb-0.5">Usulan perbaikan</span>
          <Ketik text={o.usulan_perbaikan} tunda={250} />
        </p>
      )}
    </div>
  );
}

function IsiPenjawab({ o, kunci }: { o: Record<string, any>; kunci?: string }) {
  const jawab = o.jawaban_pilihan;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--ink)]">
        <span>
          Menjawab <span className="font-mono font-bold border border-[var(--line-strong)] px-1.5">{jawab || "-"}</span>
        </span>
        {o.tingkat_keyakinan != null && (
          <span className="font-mono text-xs text-[var(--ink-muted)]">keyakinan {o.tingkat_keyakinan}/5</span>
        )}
        {kunci && jawab && (
          <span className="text-xs font-semibold" style={{ color: jawab === kunci ? "#1F6B3A" : "#A4262C" }}>
            {jawab === kunci ? "Sesuai kunci" : `Tidak sesuai kunci (${kunci})`}
          </span>
        )}
      </div>
      {o.alasan_singkat && (
        <p className="font-serif text-sm leading-relaxed text-[var(--ink-muted)]">
          <Ketik text={o.alasan_singkat} />
        </p>
      )}
    </div>
  );
}

function IsiArbiter({ o }: { o: Record<string, any> }) {
  const v = VERDICT[o.verdict] ?? { label: o.verdict || "-", warna: "#5A6070" };
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-sm">
        <span className="text-[var(--ink-muted)]">Putusan:</span>
        <span className="font-semibold" style={{ color: v.warna }}>
          {v.label}
        </span>
      </p>
      {o.alasan && (
        <p className="font-serif text-sm leading-relaxed text-[var(--ink)]">
          <Ketik text={o.alasan} />
        </p>
      )}
      {(o.level_bloom_final || o.bobot_poin_final != null || o.prediksi_kesukaran_final != null) && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-[var(--ink-muted)]">
          {o.level_bloom_final && (
            <span>
              level <span className="font-semibold text-[var(--accent)]">{o.level_bloom_final}</span>
            </span>
          )}
          {o.bobot_poin_final != null && <span>bobot {o.bobot_poin_final}</span>}
          {o.prediksi_kesukaran_final != null && <span>kesukaran {o.prediksi_kesukaran_final}</span>}
        </div>
      )}
    </div>
  );
}

export default function DebatLivePage({ params }: { params: Promise<{ butirId: string }> }) {
  const { butirId } = use(params);
  const [data, setData] = useState<DebatLive | null>(null);
  const [galat, setGalat] = useState("");
  const dasarRef = useRef<HTMLDivElement>(null);
  const jumlahPesan = useRef(0);
  const berpikirKey = useRef("");
  const [idAwal, setIdAwal] = useState<Set<string> | null>(null);
  const dariRiwayat = useSearchParams().get("dari") === "riwayat-diterima";
  const [diarsipkan, setDiarsipkan] = useState<Set<number>>(new Set());
  const [sedangSimpan, setSedangSimpan] = useState<number | null>(null);
  const [galatArsip, setGalatArsip] = useState("");

  useEffect(() => {
    apiFetch("/api/arsip")
      .then((daftar: ArsipSoal[]) =>
        setDiarsipkan(
          new Set(daftar.filter((a) => a.sumber_butir_id === butirId && a.ronde != null).map((a) => a.ronde as number)),
        ),
      )
      .catch(() => {});
  }, [butirId]);

  async function simpanKeArsip(r: number) {
    setSedangSimpan(r);
    setGalatArsip("");
    try {
      await apiFetch("/api/arsip", { method: "POST", body: JSON.stringify({ butir_id: butirId, ronde: r }) });
      setDiarsipkan((s) => new Set(s).add(r));
    } catch (err: any) {
      setGalatArsip(err.message || "Gagal menyimpan ke Arsip.");
    } finally {
      setSedangSimpan(null);
    }
  }

  const muat = useCallback(async () => {
    try {
      const d: DebatLive = await apiFetch(`/api/butir/${butirId}/debat-live`);
      setIdAwal((sebelumnya) => sebelumnya ?? new Set(d.pesan.map((p) => p.id)));
      setData(d);
      setGalat("");
      return d;
    } catch (err: any) {
      setGalat(err.message || "Gagal memuat debat.");
      return null;
    }
  }, [butirId]);

  useEffect(() => {
    let aktif = true;
    let timer: ReturnType<typeof setTimeout>;
    const putar = async () => {
      const d = await muat();
      if (!aktif) return;
      if (d === null || prosesBerjalan(d.status)) {
        timer = setTimeout(putar, JEDA_MS);
      } else {
        window.dispatchEvent(new Event("generation_status_changed"));
      }
    };
    putar();
    return () => {
      aktif = false;
      clearTimeout(timer);
    };
  }, [muat]);

  useEffect(() => {
    if (!data) return;
    const kunci = JSON.stringify(data.sedang_berpikir);
    const berubah = data.pesan.length !== jumlahPesan.current || kunci !== berpikirKey.current;
    jumlahPesan.current = data.pesan.length;
    berpikirKey.current = kunci;
    if (!berubah || jumlahPesan.current === 0) return;
    const dekatDasar = window.innerHeight + window.scrollY >= document.body.scrollHeight - 240;
    if (dekatDasar) dasarRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [data]);

  const perRonde = new Map<number, PesanDebat[]>();
  data?.pesan.forEach((p) => perRonde.set(p.ronde, [...(perRonde.get(p.ronde) ?? []), p]));
  if (data?.sedang_berpikir && !perRonde.has(data.sedang_berpikir.ronde)) perRonde.set(data.sedang_berpikir.ronde, []);
  const ronde = Array.from(perRonde.keys()).sort((a, b) => a - b);

  const penyebab = data?.status === "tertunda" ? ringkasPenyebab(data.alasan_tertunda) : null;

  return (
    <div>
      <PageHeader
        title="Debat Live"
        description="Pantau keempat agen berdebat soal ini langsung saat prosesnya berjalan. Halaman diperbarui otomatis."
        breadcrumb={[
          { label: "Generasi", href: data ? `/generasi/${data.kisi_kisi_id}` : undefined },
          { label: "Debat Live" },
        ]}
        action={
          data && (
            <div className="flex flex-wrap items-center gap-3">
              <BloomChip level={data.level_bloom} />
              <StatusBadge status={data.status} />
              <RondeIndicator ronde={data.ronde_saat_ini} maxRonde={data.max_ronde} />
            </div>
          )
        }
      />

      {galat && !data && (
        <div role="alert" className="mb-4 text-xs leading-relaxed text-[#A4262C]">
          {galat}
        </div>
      )}

      {!data ? (
        !galat && <p className="font-mono text-xs text-[var(--ink-muted)]">Memuat debat...</p>
      ) : (
        <div className="max-w-3xl space-y-8">
          {data.menunggu_giliran && (
            <div className="pesan-muncul flex items-center gap-3 border border-dashed border-[var(--line-strong)] bg-[var(--surface)] px-4 py-4 text-sm text-[var(--ink-muted)]">
              <TigaTitik />
              <span>Menunggu giliran. Soal lain dalam kisi-kisi ini sedang ditelaah, debat dimulai begitu giliran tiba.</span>
            </div>
          )}

          {ronde.map((r) => {
            const pesan = perRonde.get(r) ?? [];
            const draf = pesan.find((p) => p.agen === "penyusun")?.output_json;
            const berpikir = data.sedang_berpikir?.ronde === r ? data.sedang_berpikir : null;
            const putusan = pesan.find((p) => p.agen === "arbiter")?.output_json?.verdict;
            const bisaArsip =
              !!draf?.pertanyaan &&
              dariRiwayat &&
              data.status === "diterima" &&
              r < data.ronde_saat_ini &&
              putusan !== "diterima";
            return (
              <section key={r} aria-label={`Ronde ${r}`} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="font-serif text-lg font-normal text-[var(--ink)]">Ronde {r}</h2>
                  <span aria-hidden="true" className="h-px flex-1 bg-[var(--line-strong)]" />
                </div>

                {pesan.map((p) => (
                  <AnimasiKetik.Provider key={p.id} value={idAwal !== null && !idAwal.has(p.id)}>
                    <Kotak agen={p.agen}>
                      {p.agen === "penyusun" && <IsiPenyusun o={p.output_json} />}
                      {p.agen === "kritikus" && <IsiKritikus o={p.output_json} />}
                      {p.agen === "penjawab_buta" && <IsiPenjawab o={p.output_json} kunci={draf?.kunci_jawaban} />}
                      {p.agen === "arbiter" && <IsiArbiter o={p.output_json} />}
                    </Kotak>
                  </AnimasiKetik.Provider>
                ))}

                {bisaArsip && (
                  <div className="flex flex-wrap items-center gap-3 border border-dashed border-[var(--line-strong)] px-4 py-2.5 text-xs text-[var(--ink-muted)]">
                    {diarsipkan.has(r) ? (
                      <>
                        <span className="font-medium text-[#1F6B3A]">Soal ronde {r} tersimpan di Arsip.</span>
                        <Link href="/arsip" className="underline underline-offset-4 text-[var(--accent)]">
                          Buka Arsip Soal
                        </Link>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={sedangSimpan === r}
                          onClick={() => simpanKeArsip(r)}
                        >
                          {sedangSimpan === r ? "Menyimpan..." : "Simpan ke Arsip"}
                        </Button>
                        <span>Ronde ini belum diterima. Soal dan jawaban Penjawab Buta-nya bisa Anda simpan tanpa level Bloom, atau dibiarkan saja.</span>
                      </>
                    )}
                  </div>
                )}

                {berpikir && (
                  <div className="pesan-muncul flex items-center gap-3 px-1 py-1 text-sm text-[var(--ink-muted)]" role="status">
                    <TigaTitik />
                    <span>
                      <span className="font-medium text-[var(--ink)]">{daftarNama(berpikir.agen)}</span>{" "}
                      {berpikir.agen.length > 1 ? "sedang bekerja bersamaan" : AGEN[berpikir.agen[0]]?.kegiatan}
                    </span>
                  </div>
                )}
              </section>
            );
          })}

          {data.status === "diterima" && (
            <div className="pesan-muncul text-sm text-[#1F6B3A]">
              Debat selesai: butir diterima dan masuk ke{" "}
              <Link href="/bank-soal" className="underline underline-offset-4 font-medium">
                Bank Soal
              </Link>
              . Hanya ronde sebelum ronde penerimaan yang bisa disimpan ke Arsip, dan hanya lewat Riwayat Diterima.
            </div>
          )}
          {data.status === "ditandai" && (
            <div className="pesan-muncul border border-[#8A5A00]/30 bg-[#FBF1D9] px-4 py-3 text-sm text-[#8A5A00]">
              Debat selesai tanpa kesepakatan, jadi butir ditandai untuk Anda tinjau di{" "}
              <Link href={`/butir-ditandai/${data.butir_id}`} className="underline underline-offset-4 font-medium">
                Butir Ditandai
              </Link>
              .
            </div>
          )}
          {data.status === "ditolak" && (
            <div className="pesan-muncul text-sm text-[#A4262C]">
              Debat selesai: butir ditolak oleh Arbiter.
            </div>
          )}
          {penyebab && (
            <div className="pesan-muncul border border-[var(--line-strong)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)]">
              <span className="font-medium">{penyebab.judul}.</span>{" "}
              {penyebab.saran && <span className="text-[var(--ink-muted)]">{penyebab.saran}</span>}{" "}
              <Link href="/butir-tertunda" className="underline underline-offset-4 text-[var(--accent)]">
                Buka Butir Tertunda
              </Link>
            </div>
          )}

          {galatArsip && (
            <div role="alert" className="border border-[#A4262C]/30 text-xs leading-relaxed text-[#A4262C]">
              {galatArsip}
            </div>
          )}

          <div ref={dasarRef} />
        </div>
      )}
    </div>
  );
}
