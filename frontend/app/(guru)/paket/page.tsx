"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { PaketPemakaian, PaketPengguna, BatasPaket } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import { InstitusiAnggota, KelolaInstitusi } from "@/components/paket/InstitusiPanel";

const angka = (n: number) => n.toLocaleString("id-ID");
const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

function Meter({ terpakai, batas }: { terpakai: number; batas: number | null }) {
  if (batas === null) {
    return <p className="font-mono text-xs text-[var(--ink-muted)]">Tanpa batas</p>;
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
          className={`h-full ${penuh ? "bg-[#A4262C]" : "bg-[var(--accent)]"}`}
          style={{ width: `${persen}%` }}
        />
      </div>
      <p className="mt-1.5 font-mono text-xs tabular-nums text-[var(--ink-muted)]">
        {angka(terpakai)} dari {angka(batas)} · {persen}%
      </p>
    </div>
  );
}

function batasTeks(n: number | null, satuan: string) {
  return n === null ? "Tanpa batas" : `${angka(n)} ${satuan}`;
}

export default function PaketPage() {
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
      setGalat(err.message || "Gagal memuat data paket.");
    } finally {
      setLoading(false);
    }
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
      setGalat(err.message || "Gagal mengubah paket.");
    } finally {
      setSibukId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Paket & Pemakaian"
        description="Paket akun, kuota bulan ini, dan pemakaian layanan AI."
      />

      {galat && (
        <div role="alert" className="mb-4 text-xs leading-relaxed text-[#A4262C]">
          {galat}
        </div>
      )}

      {loading ? (
        <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono">
          Memuat data paket...
        </div>
      ) : (
        saya && (
          <div className="space-y-8">
            <section className="border border-[var(--line)] bg-[var(--surface)] p-5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-serif text-xl font-normal text-[var(--ink)]">Paket {saya.nama_paket}</h2>
                <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                  bulan {saya.bulan}
                </span>
                {saya.institusi && (
                  <span className="border border-[var(--line-strong)] bg-[var(--canvas)] rounded px-2 py-0.5 text-[11px] text-[var(--ink)]">
                    Lisensi {saya.institusi.nama}
                  </span>
                )}
                {saya.tanpa_batas && (
                  <span className="text-[11px] text-[var(--ink-muted)] underline underline-offset-4 decoration-[var(--line-strong)]">
                    {saya.kuota_aktif ? "Akun admin: tanpa batas" : "Pembatasan paket belum diberlakukan"}
                  </span>
                )}
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
                <div>
                  <span className="text-xs font-medium text-[var(--ink-muted)] block mb-1.5">Soal dibuat bulan ini</span>
                  <Meter terpakai={saya.soal.terpakai} batas={saya.soal.batas} />
                </div>
                <div>
                  <span className="text-xs font-medium text-[var(--ink-muted)] block mb-1.5">Materi ajar</span>
                  <Meter terpakai={saya.materi.terpakai} batas={saya.materi.batas} />
                </div>
                <div>
                  <span className="text-xs font-medium text-[var(--ink-muted)] block mb-1.5">Ekspor PDF dan DOCX</span>
                  <p className="font-serif text-sm text-[var(--ink)]">{saya.ekspor ? "Tersedia" : "Khusus paket Pro"}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-[var(--ink-muted)] block mb-1.5">Pemakaian AI bulan ini</span>
                  <p className="font-serif text-sm text-[var(--ink)] tabular-nums">
                    {angka(saya.token.bulan_ini)} token
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
                  Perbandingan Paket
                </h2>
                <div className="border border-[var(--line-strong)] bg-[var(--canvas)] overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-[var(--surface)] border-b border-[var(--line-strong)]">
                      <tr className="text-xs text-[var(--ink-muted)]">
                        <th className="px-3 py-2 font-medium border-r border-[var(--line)]">Fitur</th>
                        {Object.keys(daftar).map((p) => (
                          <th
                            key={p}
                            className={`px-3 py-2 font-medium capitalize ${p === saya.paket ? "text-[var(--accent)]" : ""}`}
                          >
                            {p}
                            {p === saya.paket && " (paket Anda)"}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--line)]">
                      {[
                        { label: "Soal per bulan", nilai: (b: BatasPaket) => batasTeks(b.soal, "soal") },
                        { label: "Materi ajar", nilai: (b: BatasPaket) => batasTeks(b.materi, "materi") },
                        { label: "Ekspor PDF dan DOCX", nilai: (b: BatasPaket) => (b.ekspor ? "Ya" : "Tidak") },
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
                  Untuk berpindah paket, hubungi administrator.
                </p>
              </section>
            )}

            <InstitusiAnggota onBerubah={muat} />

            {saya.admin && <KelolaInstitusi />}

            {saya.admin && pengguna && (
              <section>
                <h2 className="font-serif text-lg font-normal text-[var(--ink)] border-b border-[var(--line)] pb-2 mb-3">
                  Pengguna dan Paket
                </h2>
                <div className="border border-[var(--line-strong)] bg-[var(--canvas)] overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-[var(--surface)] border-b border-[var(--line-strong)]">
                      <tr className="text-xs text-[var(--ink-muted)]">
                        <th className="px-3 py-2 font-medium border-r border-[var(--line)]">Pengguna</th>
                        <th className="px-3 py-2 font-medium border-r border-[var(--line)]">Peran</th>
                        <th className="px-3 py-2 font-medium text-right border-r border-[var(--line)]">Soal bulan ini</th>
                        <th className="px-3 py-2 font-medium text-right border-r border-[var(--line)]">Token bulan ini</th>
                        <th className="px-3 py-2 font-medium">Paket</th>
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
                              aria-label={`Paket untuk ${u.nama}`}
                              value={u.paket}
                              disabled={sibukId === u.id}
                              onChange={(e) => ubahPaket(u.id, e.target.value)}
                              className="bg-[var(--canvas)] text-[var(--ink)] border border-[var(--line-strong)] rounded px-2 py-1 text-xs focus:outline-none focus:border-[var(--accent)]"
                            >
                              {Object.keys(daftar ?? { gratis: 0, pro: 0 }).map((p) => (
                                <option key={p} value={p}>
                                  {p}
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
