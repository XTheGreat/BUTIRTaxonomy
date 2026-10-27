"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import FormAkun from "@/components/pengaturan/FormAkun";
import FormPassword from "@/components/pengaturan/FormPassword";
import { getCurrentUser, logout } from "@/lib/auth";
import { useBahasa, useTeks, type Bahasa } from "@/lib/teks";
import type { User } from "@/lib/types";

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[160px_1fr] sm:gap-4">
      <dt className="text-sm text-[var(--ink-muted)]">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-[var(--ink)]">{nilai}</dd>
    </div>
  );
}

export default function PengaturanPage() {
  const t = useTeks();
  const { bahasa, setBahasa } = useBahasa();
  const [user, setUser] = useState<User | null>(null);

  const pilihanBahasa: { kode: Bahasa; label: string }[] = [
    { kode: "id", label: t.akun.pengaturan.bahasa.indonesia },
    { kode: "en", label: t.akun.pengaturan.bahasa.inggris },
  ];

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const peran = user?.peran === "admin" ? t.akun.pengaturan.akun.peranAdmin : t.akun.pengaturan.akun.peranGuru;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t.akun.pengaturan.judul} description={t.akun.pengaturan.deskripsi} />

      <section aria-labelledby="pengaturan-akun" className="mb-10">
        <h2 id="pengaturan-akun" className="font-serif text-xl text-[var(--ink)]">
          {t.akun.pengaturan.akun.judul}
        </h2>
        {user && <FormAkun key={user.id} user={user} onTersimpan={setUser} />}
        <dl className="border-b border-[var(--line)]">
          <Baris label={t.akun.pengaturan.akun.peran} nilai={peran} />
        </dl>
      </section>

      <section aria-labelledby="pengaturan-password" className="mb-10">
        <h2 id="pengaturan-password" className="font-serif text-xl text-[var(--ink)]">
          {t.akun.pengaturan.password.judul}
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">{t.akun.pengaturan.password.keterangan}</p>
        <FormPassword />
      </section>

      <section aria-labelledby="pengaturan-bahasa" className="mb-10">
        <h2 id="pengaturan-bahasa" className="font-serif text-xl text-[var(--ink)]">
          {t.akun.pengaturan.bahasa.judul}
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">{t.akun.pengaturan.bahasa.keterangan}</p>
        <div
          role="radiogroup"
          aria-label={t.akun.pengaturan.bahasa.judul}
          className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {pilihanBahasa.map(({ kode, label }) => {
            const terpilih = bahasa === kode;
            return (
              <button
                key={kode}
                type="button"
                role="radio"
                aria-checked={terpilih}
                onClick={() => setBahasa(kode)}
                className={`flex items-center gap-3 rounded border px-3.5 py-2.5 text-left text-sm transition-colors duration-[140ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                  terpilih
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]"
                    : "border-[var(--line-strong)] bg-[var(--canvas)] text-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    terpilih ? "bg-[var(--accent)]" : "border border-[var(--line-strong)]"
                  }`}
                />
                {label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-[var(--ink-muted)]">{t.akun.pengaturan.bahasa.catatan}</p>
      </section>

      <section aria-labelledby="pengaturan-sesi">
        <h2 id="pengaturan-sesi" className="font-serif text-xl text-[var(--ink)]">
          {t.akun.pengaturan.sesi.judul}
        </h2>
        <div className="mt-3 flex flex-col gap-3 border-y border-[var(--line)] py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--ink-muted)]">{t.akun.pengaturan.sesi.keterangan}</p>
          <Button variant="danger" onClick={logout} className="shrink-0 self-start sm:self-auto">
            {t.akun.pengaturan.sesi.keluar}
          </Button>
        </div>
      </section>
    </div>
  );
}
