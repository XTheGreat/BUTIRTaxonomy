"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { InstitusiRingkas, InstitusiSaya } from "@/lib/types";
import Button from "@/components/ui/Button";
import { useFormat } from "@/lib/format";
import { useTeks } from "@/lib/teks";

const inputCls =
  "bg-[var(--canvas)] text-[var(--ink)] border border-[var(--line-strong)] rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-[var(--accent)]";

function Judul({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-serif text-lg font-normal text-[var(--ink)] border-b border-[var(--line)] pb-2 mb-3">
      {children}
    </h2>
  );
}

export function InstitusiAnggota({ onBerubah }: { onBerubah: () => void }) {
  const t = useTeks().sistem.institusi;
  const { angka } = useFormat();
  const [data, setData] = useState<InstitusiSaya | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [galat, setGalat] = useState("");
  const [sibuk, setSibuk] = useState(false);

  const muat = useCallback(async () => {
    try {
      setData(await apiFetch("/api/institusi/saya"));
    } catch {
      setData(null);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  if (!data) return null;

  async function tambah(e: React.FormEvent) {
    e.preventDefault();
    if (!data || !email.trim()) return;
    setSibuk(true);
    setGalat("");
    try {
      await apiFetch(`/api/institusi/${data.id}/anggota`, { method: "POST", body: JSON.stringify({ email: email.trim() }) });
      setEmail("");
      await muat();
      onBerubah();
    } catch (err: any) {
      setGalat(err.message || t.gagalTambah);
    } finally {
      setSibuk(false);
    }
  }

  async function keluarkan(userId: string) {
    if (!data) return;
    setSibuk(true);
    setGalat("");
    try {
      await apiFetch(`/api/institusi/${data.id}/anggota/${userId}`, { method: "DELETE" });
      await muat();
      onBerubah();
    } catch (err: any) {
      setGalat(err.message || t.gagalKeluarkan);
    } finally {
      setSibuk(false);
    }
  }

  return (
    <section>
      <Judul>
        {t.judul(data.nama)}
        <span className="ml-3 font-mono text-xs text-[var(--ink-muted)]">
          {t.kursiTerisi(data.anggota, data.kursi)}
          {!data.aktif && t.lisensiTidakAktif}
        </span>
      </Judul>

      {galat && (
        <div role="alert" className="mb-3 text-xs leading-relaxed text-[#A4262C]">
          {galat}
        </div>
      )}

      <div className="border border-[var(--line-strong)] bg-[var(--canvas)] overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-[var(--surface)] border-b border-[var(--line-strong)]">
            <tr className="text-xs text-[var(--ink-muted)]">
              <th className="px-3 py-2 font-medium border-r border-[var(--line)]">{t.anggota}</th>
              <th className="px-3 py-2 font-medium text-right border-r border-[var(--line)]">{t.soalBulanIni}</th>
              <th className="px-3 py-2 font-medium text-right border-r border-[var(--line)]">{t.tokenBulanIni}</th>
              <th className="px-3 py-2 font-medium">{t.aksi}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {data.anggota_daftar.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-2 border-r border-[var(--line)]">
                  <span className="font-serif block">
                    {u.nama}
                    {u.admin_institusi && (
                      <span className="ml-2 border border-[var(--accent)]/40 bg-[var(--accent-soft)] rounded px-1.5 py-px text-[10px] text-[var(--accent)]">
                        {t.adminInstitusi}
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--ink-muted)]">{u.email}</span>
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs tabular-nums border-r border-[var(--line)]">
                  {angka(u.soal_bulan_ini)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs tabular-nums border-r border-[var(--line)]">
                  {angka(u.token_bulan_ini)}
                </td>
                <td className="px-3 py-2">
                  {data.bisa_kelola && !u.admin_institusi ? (
                    <Button size="sm" variant="ghost" disabled={sibuk} onClick={() => keluarkan(u.id)}>
                      {t.keluarkan}
                    </Button>
                  ) : (
                    <span className="text-xs text-[var(--ink-muted)]">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.bisa_kelola && (
        <form onSubmit={tambah} className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor="email-anggota" className="text-xs text-[var(--ink-muted)]">
            {t.tambahAnggota}
          </label>
          <input
            id="email-anggota"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.placeholderEmail}
            className={`${inputCls} w-72 max-w-full`}
          />
          <Button type="submit" size="sm" variant="secondary" disabled={sibuk || !email.trim()}>
            {t.tambahkan}
          </Button>
        </form>
      )}
    </section>
  );
}

export function KelolaInstitusi() {
  const t = useTeks().sistem.institusi.kelola;
  const [daftar, setDaftar] = useState<InstitusiRingkas[]>([]);
  const [nama, setNama] = useState("");
  const [kursi, setKursi] = useState("10");
  const [emailAdmin, setEmailAdmin] = useState("");
  const [galat, setGalat] = useState("");
  const [sibuk, setSibuk] = useState(false);

  const muat = useCallback(async () => {
    try {
      setDaftar(await apiFetch("/api/institusi"));
    } catch (err: any) {
      setGalat(err.message || t.gagalMuat);
    }
  }, [t.gagalMuat]);

  useEffect(() => {
    muat();
  }, [muat]);

  async function buat(e: React.FormEvent) {
    e.preventDefault();
    setSibuk(true);
    setGalat("");
    try {
      await apiFetch("/api/institusi", {
        method: "POST",
        body: JSON.stringify({ nama: nama.trim(), kursi: parseInt(kursi) || 1, email_admin: emailAdmin.trim() }),
      });
      setNama("");
      setEmailAdmin("");
      await muat();
    } catch (err: any) {
      setGalat(err.message || t.gagalBuat);
    } finally {
      setSibuk(false);
    }
  }

  async function ubah(id: string, isi: { kursi?: number; aktif?: boolean }) {
    setSibuk(true);
    setGalat("");
    try {
      await apiFetch(`/api/institusi/${id}`, { method: "PUT", body: JSON.stringify(isi) });
      await muat();
    } catch (err: any) {
      setGalat(err.message || t.gagalUbah);
    } finally {
      setSibuk(false);
    }
  }

  return (
    <section>
      <Judul>{t.judul}</Judul>

      {galat && (
        <div role="alert" className="mb-3 text-xs leading-relaxed text-[#A4262C]">
          {galat}
        </div>
      )}

      <div className="border border-[var(--line-strong)] bg-[var(--canvas)] overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-[var(--surface)] border-b border-[var(--line-strong)]">
            <tr className="text-xs text-[var(--ink-muted)]">
              <th className="px-3 py-2 font-medium border-r border-[var(--line)]">{t.institusi}</th>
              <th className="px-3 py-2 font-medium text-right border-r border-[var(--line)]">{t.anggota}</th>
              <th className="px-3 py-2 font-medium border-r border-[var(--line)]">{t.kursi}</th>
              <th className="px-3 py-2 font-medium">{t.lisensi}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {daftar.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-xs text-[var(--ink-muted)]">
                  {t.kosong}
                </td>
              </tr>
            ) : (
              daftar.map((i) => (
                <tr key={i.id}>
                  <td className="px-3 py-2 font-serif border-r border-[var(--line)]">{i.nama}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums border-r border-[var(--line)]">
                    {i.anggota}
                  </td>
                  <td className="px-3 py-2 border-r border-[var(--line)]">
                    <input
                      type="number"
                      min={Math.max(1, i.anggota)}
                      defaultValue={i.kursi}
                      aria-label={t.kursiUntuk(i.nama)}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value);
                        if (v && v !== i.kursi) ubah(i.id, { kursi: v });
                      }}
                      className={`${inputCls} w-20 font-mono tabular-nums`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant={i.aktif ? "secondary" : "primary"}
                      disabled={sibuk}
                      onClick={() => ubah(i.id, { aktif: !i.aktif })}
                    >
                      {i.aktif ? t.nonaktifkan : t.aktifkan}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={buat} className="mt-3 flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="inst-nama" className="text-xs text-[var(--ink-muted)]">
            {t.namaInstitusi}
          </label>
          <input id="inst-nama" required value={nama} onChange={(e) => setNama(e.target.value)} className={`${inputCls} w-56`} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="inst-kursi" className="text-xs text-[var(--ink-muted)]">
            {t.kursi}
          </label>
          <input
            id="inst-kursi"
            type="number"
            min={1}
            required
            value={kursi}
            onChange={(e) => setKursi(e.target.value)}
            className={`${inputCls} w-20 font-mono tabular-nums`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="inst-admin" className="text-xs text-[var(--ink-muted)]">
            {t.emailAdmin}
          </label>
          <input
            id="inst-admin"
            type="email"
            required
            value={emailAdmin}
            onChange={(e) => setEmailAdmin(e.target.value)}
            placeholder={t.placeholderAdmin}
            className={`${inputCls} w-64`}
          />
        </div>
        <Button type="submit" size="sm" variant="secondary" disabled={sibuk}>
          {t.buat}
        </Button>
      </form>
    </section>
  );
}
