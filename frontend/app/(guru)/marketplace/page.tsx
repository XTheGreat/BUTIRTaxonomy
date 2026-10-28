"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatWaktu } from "@/lib/format";
import { ButirSoal, ListingMarketplace, RekapTransaksi, TransaksiMarket } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import BloomChip from "@/components/ui/BloomChip";
import BloomText from "@/components/ui/BloomText";
import MathText from "@/components/ui/MathText";
import FilterButir, { FILTER_AWAL, filterAktif, NilaiFilterButir } from "@/components/ui/FilterButir";
import KelompokLipat, { useBukaTutup } from "@/components/ui/KelompokLipat";
import { KelompokBank, kelompokkan } from "@/lib/kelompokBank";
import { useTeks } from "@/lib/teks";

const rupiah = (n: number, gratis: string) => (n === 0 ? gratis : `Rp${n.toLocaleString("id-ID")}`);

const WARNA_TRANSAKSI: Record<string, string> = {
  selesai: "var(--status-diterima)",
  menunggu_pembayaran: "var(--status-ditandai)",
  dibatalkan: "var(--status-netral)",
};

const inputCls =
  "bg-[var(--canvas)] text-[var(--ink)] border border-[var(--line-strong)] rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-[var(--accent-text)]";

type Tab = "jelajahi" | "jual" | "transaksi";

function Distribusi({ d }: { d: Record<string, number> }) {
  return (
    <span className="font-mono text-xs text-[var(--ink-muted)]">
      <BloomText text={Object.entries(d).map(([lv, n]) => `${lv} ×${n}`).join(" · ")} />
    </span>
  );
}

function StatusTransaksi({ status }: { status: string }) {
  const t = useTeks().telaah.marketplace;
  const label: Record<string, string> = t.statusTransaksi;
  const s = { label: label[status] ?? status, warna: WARNA_TRANSAKSI[status] ?? "var(--status-netral)" };
  return (
    <span className="inline-flex items-center text-xs font-semibold" style={{ color: s.warna }}>
      {s.label}
    </span>
  );
}

export default function MarketplacePage() {
  const t = useTeks().telaah.marketplace;
  const rp = (n: number) => rupiah(n, t.gratis);
  const [tab, setTab] = useState<Tab>("jelajahi");
  const [galat, setGalat] = useState("");
  const [info, setInfo] = useState("");
  const [sibuk, setSibuk] = useState(false);

  const [listing, setListing] = useState<ListingMarketplace[] | null>(null);
  const [milikku, setMilikku] = useState<ListingMarketplace[]>([]);
  const [rekap, setRekap] = useState<RekapTransaksi | null>(null);
  const [bank, setBank] = useState<ButirSoal[]>([]);
  const [kelompokList, setKelompokList] = useState<KelompokBank[]>([]);
  const [filter, setFilter] = useState<NilaiFilterButir>(FILTER_AWAL);
  const { ada: kelompokTerbuka, toggle: bukaTutup } = useBukaTutup();
  const [terbuka, setTerbuka] = useState<string | null>(null);
  const [detail, setDetail] = useState<ListingMarketplace | null>(null);
  const [admin, setAdmin] = useState(false);
  const [menunggu, setMenunggu] = useState<TransaksiMarket[]>([]);

  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [harga, setHarga] = useState("0");
  const [dipilih, setDipilih] = useState<Set<string>>(new Set());

  const menyaring = filterAktif(filter);
  const bankTampil = useMemo(() => {
    const kata = filter.cari.trim().toLowerCase();
    return bank.filter(
      (b) =>
        (!filter.kisi || b.kisi_kisi_id === filter.kisi) &&
        (filter.bloom.length === 0 || filter.bloom.includes(b.level_bloom)) &&
        (!kata || b.pertanyaan.toLowerCase().includes(kata)) &&
        (!filter.hanyaTerpilih || dipilih.has(b.id))
    );
  }, [bank, filter, dipilih]);
  const grup = useMemo(() => kelompokkan(bankTampil, kelompokList), [bankTampil, kelompokList]);

  function pilihKelompok(ids: string[]) {
    setDipilih((prev) => {
      const n = new Set(prev);
      const semua = ids.every((id) => n.has(id));
      ids.forEach((id) => (semua ? n.delete(id) : n.add(id)));
      return n;
    });
  }

  const muat = useCallback(async () => {
    try {
      const [l, m, r, b, kel, p] = await Promise.all([
        apiFetch("/api/marketplace/listing"),
        apiFetch("/api/marketplace/listing?saya=true"),
        apiFetch("/api/marketplace/transaksi/saya"),
        apiFetch("/api/bank-soal"),
        apiFetch("/api/bank-soal/kelompok"),
        apiFetch("/api/paket/saya"),
      ]);
      setListing(l);
      setMilikku(m);
      setRekap(r);
      setBank(b);
      setKelompokList(Array.isArray(kel) ? kel : []);
      setAdmin(!!p.admin);
      if (p.admin) setMenunggu(await apiFetch("/api/marketplace/transaksi?status=menunggu_pembayaran"));
    } catch (err: any) {
      setGalat(err.message || t.gagalMemuat);
    }
  }, [t.gagalMemuat]);

  useEffect(() => {
    muat();
  }, [muat]);

  async function jalankan(aksi: () => Promise<void>, pesan?: string) {
    setSibuk(true);
    setGalat("");
    setInfo("");
    try {
      await aksi();
      if (pesan) setInfo(pesan);
      await muat();
    } catch (err: any) {
      setGalat(err.message || t.aksiGagal);
    } finally {
      setSibuk(false);
    }
  }

  async function bukaDetail(id: string) {
    if (terbuka === id) {
      setTerbuka(null);
      return;
    }
    setTerbuka(id);
    setDetail(null);
    try {
      setDetail(await apiFetch(`/api/marketplace/listing/${id}`));
    } catch (err: any) {
      setGalat(err.message || t.gagalMemuatRincian);
    }
  }

  const beli = (l: ListingMarketplace) =>
    jalankan(
      () => apiFetch(`/api/marketplace/listing/${l.id}/beli`, { method: "POST" }),
      l.harga_rp === 0
        ? t.pesanBeliGratis
        : t.pesanBeliBerbayar
    );

  const terbitkan = (e: React.FormEvent) => {
    e.preventDefault();
    return jalankan(async () => {
      await apiFetch("/api/marketplace/listing", {
        method: "POST",
        body: JSON.stringify({
          judul: judul.trim(),
          deskripsi: deskripsi.trim(),
          harga_rp: parseInt(harga) || 0,
          butir_ids: Array.from(dipilih),
        }),
      });
      setJudul("");
      setDeskripsi("");
      setHarga("0");
      setDipilih(new Set());
    }, t.pesanTerbit);
  };

  const tabs: [Tab, string][] = [
    ["jelajahi", t.tab.jelajahi],
    ["jual", t.tab.jual],
    ["transaksi", t.tab.transaksi],
  ];

  return (
    <div>
      <PageHeader
        title={t.judul}
        description={t.deskripsi}
      />

      {galat && (
        <div role="alert" className="mb-4 text-xs leading-relaxed text-[var(--status-ditolak)]">
          {galat}
        </div>
      )}
      {info && (
        <div role="status" className="mb-4 text-xs leading-relaxed text-[var(--status-diterima)]">
          {info}
        </div>
      )}

      <div role="tablist" className="flex gap-6 border-b border-[var(--line)] mb-5">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`pb-2 -mb-px text-[15px] font-serif border-b-2 transition-colors ${
              tab === key
                ? "border-[var(--accent)] text-[var(--ink)] font-medium"
                : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "jelajahi" && (
        <div className="space-y-3">
          {listing === null ? (
            <p className="font-mono text-xs text-[var(--ink-muted)]">{t.memuat}</p>
          ) : listing.length === 0 ? (
            <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--ink-muted)]">
              {t.belumAdaDijual}
            </div>
          ) : (
            listing.map((l) => (
              <article key={l.id} className="border border-[var(--line)] bg-[var(--canvas)]">
                <div className="flex flex-wrap items-start justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-base text-[var(--ink)]">{l.judul}</h3>
                    <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                      {t.olehPenjual(l.penjual, l.jumlah_butir)} · <Distribusi d={l.distribusi_bloom} />
                    </p>
                    {l.deskripsi && <p className="mt-2 text-sm text-[var(--ink)] leading-relaxed">{l.deskripsi}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm tabular-nums text-[var(--ink)]">{rp(l.harga_rp)}</span>
                    <Button size="sm" variant="ghost" onClick={() => bukaDetail(l.id)} aria-expanded={terbuka === l.id}>
                      {terbuka === l.id ? t.tutup : t.pratinjau}
                    </Button>
                    {l.status_pembelian ? (
                      <StatusTransaksi status={l.status_pembelian} />
                    ) : (
                      <Button size="sm" variant="primary" disabled={sibuk} onClick={() => beli(l)}>
                        {t.beli}
                      </Button>
                    )}
                  </div>
                </div>
                {terbuka === l.id && (
                  <div className="border-t border-[var(--line)] bg-[var(--surface)] px-4 py-3">
                    {!detail ? (
                      <p className="font-mono text-xs text-[var(--ink-muted)]">{t.memuatPratinjau}</p>
                    ) : (
                      <>
                        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                          {t.keteranganPratinjau}
                        </p>
                        <ol className="space-y-2">
                          {detail.pratinjau?.map((b) => (
                            <li key={b.urutan} className="flex gap-3 text-sm">
                              <BloomChip level={b.level_bloom} className="h-fit" />
                              <span className="font-serif text-[var(--ink)]">
                                <MathText text={b.pertanyaan} />
                              </span>
                            </li>
                          ))}
                        </ol>
                      </>
                    )}
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      )}

      {tab === "jual" && (
        <div className="space-y-8">
          <form onSubmit={terbitkan} className="w-full min-w-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_160px] gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="mk-judul" className="text-xs text-[var(--ink-muted)]">{t.form.judul}</label>
                <input id="mk-judul" required minLength={3} value={judul} onChange={(e) => setJudul(e.target.value)} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="mk-harga" className="text-xs text-[var(--ink-muted)]">{t.form.harga}</label>
                <input
                  id="mk-harga"
                  type="number"
                  min={0}
                  required
                  value={harga}
                  onChange={(e) => setHarga(e.target.value)}
                  className={`${inputCls} font-mono tabular-nums`}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="mk-desk" className="text-xs text-[var(--ink-muted)]">{t.form.deskripsiOpsional}</label>
              <textarea id="mk-desk" rows={2} value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} className={inputCls} />
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm font-medium text-[var(--ink)]">{t.form.pilihButir}</span>
                <span className="font-mono text-xs tabular-nums text-[var(--ink-muted)]">{t.dipilih(dipilih.size)}</span>
              </div>
              {bank.length === 0 ? (
                <p className="text-xs text-[var(--ink-muted)]">{t.bankKosong}</p>
              ) : (
                <>
                  <FilterButir
                    nilai={filter}
                    onUbah={setFilter}
                    kelompok={kelompokList}
                    jumlahTampil={bankTampil.length}
                    jumlahTotal={bank.length}
                  />
                  <div className="daftar-gulir space-y-3 sm:pr-1">
                    {grup.length === 0 && (
                      <p className="border border-dashed border-[var(--line-strong)] px-4 py-8 text-center font-sans text-sm text-[var(--ink-muted)]">
                        {t.tidakCocokFilter}
                      </p>
                    )}
                    {grup.map((g) => {
                      const ids = g.butir.map((b) => b.id);
                      const semua = ids.every((id) => dipilih.has(id));
                      return (
                        <KelompokLipat
                          key={g.kelompok.id}
                          bingkai
                          kelompok={g.kelompok}
                          jumlah={g.butir.length}
                          terbuka={menyaring || kelompokTerbuka(g.kelompok.id)}
                          onToggle={() => bukaTutup(g.kelompok.id)}
                          tambahan={
                            <span>
                              <span className="font-mono tabular-nums text-[var(--accent-text)]">
                                {ids.filter((id) => dipilih.has(id)).length}
                              </span>{" "}
                              {t.dipilihKata}
                            </span>
                          }
                          aksi={
                            <button
                              type="button"
                              onClick={() => pilihKelompok(ids)}
                              className="shrink-0 text-xs font-medium text-[var(--accent-text)] hover:underline focus-visible:outline-none"
                            >
                              {semua ? t.batalPilihKelompok : t.pilihKelompok}
                            </button>
                          }
                        >
                          <ul className="divide-y divide-[var(--line)]">
                            {g.butir.map((b) => (
                              <li key={b.id}>
                                <label className="flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--surface)]">
                                  <input
                                    type="checkbox"
                                    checked={dipilih.has(b.id)}
                                    onChange={() => pilihKelompok([b.id])}
                                    className="mt-1 accent-[var(--accent)]"
                                  />
                                  <BloomChip level={b.level_bloom} className="h-fit" />
                                  <span className="font-serif text-sm text-[var(--ink)] line-clamp-2">
                                    <MathText text={b.pertanyaan} gulir={false} />
                                  </span>
                                </label>
                              </li>
                            ))}
                          </ul>
                        </KelompokLipat>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <Button type="submit" variant="primary" disabled={sibuk || dipilih.size === 0 || judul.trim().length < 3}>
              {t.form.terbitkan}
            </Button>
            {rekap && (
              <p className="text-xs text-[var(--ink-muted)]">
                {t.form.catatanKomisi(rekap.komisi_persen)}
              </p>
            )}
          </form>

          <section>
            <h2 className="font-serif text-lg font-normal text-[var(--ink)] border-b border-[var(--line)] pb-2 mb-3">
              {t.bankSayaDijual}
            </h2>
            {milikku.length === 0 ? (
              <p className="text-xs text-[var(--ink-muted)]">{t.belumDiterbitkan}</p>
            ) : (
              <div className="border border-[var(--line-strong)] bg-[var(--canvas)] overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-[var(--surface)] border-b border-[var(--line-strong)]">
                    <tr className="text-xs text-[var(--ink-muted)]">
                      <th className="px-3 py-2 font-medium border-r border-[var(--line)]">{t.kolom.judul}</th>
                      <th className="px-3 py-2 font-medium text-right border-r border-[var(--line)]">{t.kolom.butir}</th>
                      <th className="px-3 py-2 font-medium text-right border-r border-[var(--line)]">{t.kolom.harga}</th>
                      <th className="px-3 py-2 font-medium">{t.kolom.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {milikku.map((l) => (
                      <tr key={l.id}>
                        <td className="px-3 py-2 font-serif border-r border-[var(--line)]">{l.judul}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs tabular-nums border-r border-[var(--line)]">{l.jumlah_butir}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs tabular-nums border-r border-[var(--line)]">{rp(l.harga_rp)}</td>
                        <td className="px-3 py-2">
                          <Button
                            size="sm"
                            variant={l.aktif ? "secondary" : "primary"}
                            disabled={sibuk}
                            onClick={() =>
                              jalankan(() =>
                                apiFetch(`/api/marketplace/listing/${l.id}`, { method: "PUT", body: JSON.stringify({ aktif: !l.aktif }) })
                              )
                            }
                          >
                            {l.aktif ? t.hentikanPenjualan : t.jualLagi}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "transaksi" && rekap && (
        <div className="space-y-8">
          {admin && (
            <section>
              <h2 className="font-serif text-lg font-normal text-[var(--ink)] border-b border-[var(--line)] pb-2 mb-3">
                {t.menungguKonfirmasi}
              </h2>
              {menunggu.length === 0 ? (
                <p className="text-xs text-[var(--ink-muted)]">{t.tidakAdaPesanan}</p>
              ) : (
                <div className="border border-[var(--line-strong)] bg-[var(--canvas)] overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-[var(--surface)] border-b border-[var(--line-strong)]">
                      <tr className="text-xs text-[var(--ink-muted)]">
                        <th className="px-3 py-2 font-medium border-r border-[var(--line)]">{t.kolom.bankSoal}</th>
                        <th className="px-3 py-2 font-medium border-r border-[var(--line)]">{t.kolom.pembeli}</th>
                        <th className="px-3 py-2 font-medium text-right border-r border-[var(--line)]">{t.kolom.harga}</th>
                        <th className="px-3 py-2 font-medium">{t.kolom.aksi}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line)]">
                      {menunggu.map((m) => (
                        <tr key={m.id}>
                          <td className="px-3 py-2 font-serif border-r border-[var(--line)]">{m.judul}</td>
                          <td className="px-3 py-2 text-xs border-r border-[var(--line)]">{m.pembeli}</td>
                          <td className="px-3 py-2 text-right font-mono text-xs tabular-nums border-r border-[var(--line)]">{rp(m.harga_rp)}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                variant="primary"
                                disabled={sibuk}
                                onClick={() => jalankan(() => apiFetch(`/api/marketplace/transaksi/${m.id}/konfirmasi`, { method: "PUT" }), t.pesanDikonfirmasi)}
                              >
                                {t.konfirmasi}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={sibuk}
                                onClick={() => jalankan(() => apiFetch(`/api/marketplace/transaksi/${m.id}/batalkan`, { method: "PUT" }))}
                              >
                                {t.batalkan}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          <section>
            <h2 className="font-serif text-lg font-normal text-[var(--ink)] border-b border-[var(--line)] pb-2 mb-3">{t.pembelianSaya}</h2>
            <DaftarTransaksi data={rekap.pembelian} kosong={t.belumAdaPembelian} />
          </section>

          <section>
            <h2 className="font-serif text-lg font-normal text-[var(--ink)] border-b border-[var(--line)] pb-2 mb-3">
              {t.penjualanSaya}
              <span className="ml-3 font-mono text-xs text-[var(--ink-muted)]">
                {t.ringkasPendapatan(rp(rekap.total_pendapatan_rp), rekap.komisi_persen)}
              </span>
            </h2>
            <DaftarTransaksi data={rekap.penjualan} kosong={t.belumAdaPenjualan} tampilkanBersih />
          </section>
        </div>
      )}
    </div>
  );
}

function DaftarTransaksi({
  data,
  kosong,
  tampilkanBersih = false,
}: {
  data: TransaksiMarket[];
  kosong: string;
  tampilkanBersih?: boolean;
}) {
  const t = useTeks().telaah.marketplace;
  const rp = (n: number) => rupiah(n, t.gratis);
  if (data.length === 0) return <p className="text-xs text-[var(--ink-muted)]">{kosong}</p>;
  return (
    <div className="border border-[var(--line-strong)] bg-[var(--canvas)] overflow-x-auto">
      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-[var(--surface)] border-b border-[var(--line-strong)]">
          <tr className="text-xs text-[var(--ink-muted)]">
            <th className="px-3 py-2 font-medium border-r border-[var(--line)]">{t.kolom.bankSoal}</th>
            <th className="px-3 py-2 font-medium text-right border-r border-[var(--line)]">{t.kolom.harga}</th>
            {tampilkanBersih && <th className="px-3 py-2 font-medium text-right border-r border-[var(--line)]">{t.kolom.bersih}</th>}
            <th className="px-3 py-2 font-medium border-r border-[var(--line)]">{t.kolom.status}</th>
            <th className="px-3 py-2 font-medium">{t.kolom.waktu}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {data.map((d) => (
            <tr key={d.id}>
              <td className="px-3 py-2 font-serif border-r border-[var(--line)]">{d.judul}</td>
              <td className="px-3 py-2 text-right font-mono text-xs tabular-nums border-r border-[var(--line)]">{rp(d.harga_rp)}</td>
              {tampilkanBersih && (
                <td className="px-3 py-2 text-right font-mono text-xs tabular-nums border-r border-[var(--line)]">
                  {rp(d.pendapatan_penjual_rp)}
                </td>
              )}
              <td className="px-3 py-2 border-r border-[var(--line)]">
                <StatusTransaksi status={d.status} />
              </td>
              <td className="px-3 py-2 text-xs tabular-nums text-[var(--ink-muted)] whitespace-nowrap">{formatWaktu(d.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
