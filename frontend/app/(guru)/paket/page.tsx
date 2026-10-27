"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PaketPemakaian, PaketPengguna, BatasPaket } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import { useFormat } from "@/lib/format";
import { useTeks } from "@/lib/teks";
import { InstitusiAnggota, KelolaInstitusi } from "@/components/paket/InstitusiPanel";

function Meter({ terpakai, batas }: { terpakai: number; batas: number | null }) {
  const { sistem, umum } = useTeks();
  const { angka } = useFormat();
  if (batas === null) {
    return <p className="font-mono text-xs text-[var(--ink-muted)]">{umum.tanpaBatas}</p>;
  }
  const persen = Math.min(100, Math.round((100 * terpakai) / batas));
  const penuh = terpakai >= batas;
  return (
    <div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={batas}
        aria-valuenow={Math.min(terpakai, batas)}
        className="h-2.5 w-full border border-[var(--line-strong)] bg-[var(--canvas)]"
      >
        <div
          className={`h-full ${penuh ? "bg-[var(--status-ditolak)]" : "bg-[var(--accent)]"}`}
          style={{ width: `${persen}%` }}
        />
      </div>
      <p className="mt-1.5 font-mono text-xs tabular-nums text-[var(--ink-muted)]">
        {sistem.paket.meter(angka(terpakai), angka(batas), persen)}
      </p>
    </div>
  );
}

export default function PaketPage() {
  const { sistem, umum } = useTeks();
  const t = sistem.paket;
  const labelPaket = (id: string) => t.labelPaket[id] ?? id;
  const { angka, rupiah } = useFormat();
  const batasTeks = (n: number | null, satuan: string) => (n === null ? umum.tanpaBatas : `${angka(n)} ${satuan}`);
  const [saya, setSaya] = useState<PaketPemakaian | null>(null);
  const [daftar, setDaftar] = useState<Record<string, BatasPaket> | null>(null);
  const [pengguna, setPengguna] = useState<PaketPengguna[] | null>(null);
  const [galat, setGalat] = useState("");
  const [loading, setLoading] = useState(true);
  const [sibukId, setSibukId] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setGalat("");
    try {
      const [s, d] = await Promise.all([apiFetch("/api/paket/saya"), apiFetch("/api/paket/daftar")]);
      setSaya(s);
      setDaftar(d);
      if (s.admin) {
        setPengguna(await apiFetch("/api/paket/pengguna"));
      }
    } catch (err: any) {
      setGalat(err.message || t.gagalMuat);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  async function ubahPaket(id: string, paket: string) {
    setSibukId(id);
    setGalat("");
    try {
      await apiFetch(`/api/paket/pengguna/${id}`, { method: "PUT", body: JSON.stringify({ paket }) });
      await muat();
    } catch (err: any) {
      setGalat(err.message || t.gagalUbah);
    } finally {
      setSibukId(null);
    }
  }

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

      {loading ? (
        <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono">
          {t.memuat}
        </div>
      ) : (
        saya && (
          <div className="space-y-8">
            <section className="border border-[var(--line)] bg-[var(--surface)] p-5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-serif text-xl font-normal text-[var(--ink)]">{t.namaPaket(labelPaket(saya.paket))}</h2>
                <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                  {t.bulan(saya.bulan)}
                </span>
                {saya.institusi && (
                  <span className="border border-[var(--line-strong)] bg-[var(--canvas)] rounded px-2 py-0.5 text-[11px] text-[var(--ink)]">
                    {t.lisensi(saya.institusi.nama)}
                  </span>
                )}
                {saya.tanpa_batas && (
                  <span className="text-[11px] text-[var(--ink-muted)] underline underline-offset-4 decoration-[var(--line-strong)]">
                    {saya.kuota_aktif ? t.akunAdmin : t.belumDiberlakukan}
                  </span>
                )}
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
                <div>
                  <span className="text-xs font-medium text-[var(--ink-muted)] block mb-1.5">{t.soalBulanIni}</span>
                  <Meter terpakai={saya.soal.terpakai} batas={saya.soal.batas} />
                </div>
                <div>
                  <span className="text-xs font-medium text-[var(--ink-muted)] block mb-1.5">{t.materiAjar}</span>
                  <Meter terpakai={saya.materi.terpakai} batas={saya.materi.batas} />
                </div>
                <div>
                  <span className="text-xs font-medium text-[var(--ink-muted)] block mb-1.5">{t.eksporPdfDocx}</span>
                  <p className="font-serif text-sm text-[var(--ink)]">{saya.ekspor ? t.tersedia : t.khususPro}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-[var(--ink-muted)] block mb-1.5">{t.pemakaianAi}</span>
                  <p className="font-serif text-sm text-[var(--ink)] tabular-nums">
                    {angka(saya.token.bulan_ini)} {t.token}
                    {saya.token.estimasi_biaya_rp !== null && (
                      <span className="ml-2 font-mono text-xs text-[var(--ink-muted)]">
                        ± {rupiah(saya.token.estimasi_biaya_rp)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </section>

            {daftar && (
              <section>
                <h2 className="font-serif text-lg font-normal text-[var(--ink)] border-b border-[var(--line)] pb-2 mb-3">
                  {t.perbandingan.judul}
                </h2>
                <div className="border border-[var(--line-strong)] bg-[var(--canvas)] overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-[var(--surface)] border-b border-[var(--line-strong)]">
                      <tr className="text-xs text-[var(--ink-muted)]">
                        <th className="px-3 py-2 font-medium border-r border-[var(--line)]">{t.perbandingan.fitur}</th>
                        {Object.keys(daftar).map((p) => (
                          <th
                            key={p}
                            className={`px-3 py-2 font-medium capitalize ${p === saya.paket ? "text-[var(--accent-text)]" : ""}`}
                          >
                            {labelPaket(p)}
                            {p === saya.paket && t.perbandingan.paketAnda}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line)]">
                      {[
                        { label: t.perbandingan.soalPerBulan, nilai: (b: BatasPaket) => batasTeks(b.soal, t.satuanSoal) },
                        { label: t.materiAjar, nilai: (b: BatasPaket) => batasTeks(b.materi, t.satuanMateri) },
                        { label: t.eksporPdfDocx, nilai: (b: BatasPaket) => (b.ekspor ? t.perbandingan.ya : t.perbandingan.tidak) },
                      ].map((baris) => (
                        <tr key={baris.label}>
                          <td className="px-3 py-2 font-serif border-r border-[var(--line)]">{baris.label}</td>
                          {Object.entries(daftar).map(([p, b]) => (
                            <td key={p} className="px-3 py-2 font-mono text-xs tabular-nums">
                              {baris.nilai(b)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-[var(--ink-muted)]">
                  {t.perbandingan.hubungiAdmin}
                </p>
              </section>
            )}

            <InstitusiAnggota onBerubah={muat} />

            {saya.admin && <KelolaInstitusi />}

            {saya.admin && pengguna && (
              <section>
                <h2 className="font-serif text-lg font-normal text-[var(--ink)] border-b border-[var(--line)] pb-2 mb-3">
                  {t.pengguna.judul}
                </h2>
                <div className="border border-[var(--line-strong)] bg-[var(--canvas)] overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-[var(--surface)] border-b border-[var(--line-strong)]">
                      <tr className="text-xs text-[var(--ink-muted)]">
                        <th className="px-3 py-2 font-medium border-r border-[var(--line)]">{t.pengguna.kolomPengguna}</th>
                        <th className="px-3 py-2 font-medium border-r border-[var(--line)]">{t.pengguna.peran}</th>
                        <th className="px-3 py-2 font-medium text-right border-r border-[var(--line)]">{t.pengguna.soalBulanIni}</th>
                        <th className="px-3 py-2 font-medium text-right border-r border-[var(--line)]">{t.pengguna.tokenBulanIni}</th>
                        <th className="px-3 py-2 font-medium">{t.pengguna.paket}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line)]">
                      {pengguna.map((u) => (
                        <tr key={u.id}>
                          <td className="px-3 py-2 border-r border-[var(--line)]">
                            <span className="font-serif block">{u.nama}</span>
                            <span className="font-mono text-[11px] text-[var(--ink-muted)]">{u.email}</span>
                          </td>
                          <td className="px-3 py-2 text-xs capitalize border-r border-[var(--line)]">{u.peran}</td>
                          <td className="px-3 py-2 text-right font-mono text-xs tabular-nums border-r border-[var(--line)]">
                            {angka(u.soal_bulan_ini)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs tabular-nums border-r border-[var(--line)]">
                            {angka(u.token_bulan_ini)}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              aria-label={t.pengguna.paketUntuk(u.nama)}
                              value={u.paket}
                              disabled={sibukId === u.id}
                              onChange={(e) => ubahPaket(u.id, e.target.value)}
                              className="bg-[var(--canvas)] text-[var(--ink)] border border-[var(--line-strong)] rounded px-2 py-1 text-xs focus:outline-none focus:border-[var(--accent-text)]"
                            >
                              {Object.keys(daftar ?? { gratis: 0, pro: 0 }).map((p) => (
                                <option key={p} value={p}>
                                  {labelPaket(p)}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        )
      )}
    </div>
  );
}
