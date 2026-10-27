"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { BagianKepala, Subjudul } from "@/components/pengaturan/BagianKepala";
import FormAkun from "@/components/pengaturan/FormAkun";
import FormPassword from "@/components/pengaturan/FormPassword";
import { getCurrentUser, logout } from "@/lib/auth";
import { useTeks } from "@/lib/teks";
import type { User } from "@/lib/types";

export default function Akun() {
  const t = useTeks().akun.pengaturan;
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const peran = user?.peran === "admin" ? t.akun.peranAdmin : t.akun.peranGuru;

  return (
    <div className="space-y-8">
      <BagianKepala judul={t.bagian.akun} keterangan={t.deskripsi} />

      <section aria-label={t.akun.judul} className="space-y-1">
        {user && <FormAkun key={user.id} user={user} onTersimpan={setUser} />}
        <dl className="grid grid-cols-1 gap-1 border-b border-[var(--line)] py-3 sm:grid-cols-[160px_1fr] sm:gap-4">
          <dt className="text-sm text-[var(--ink-muted)]">{t.akun.peran}</dt>
          <dd className="text-sm text-[var(--ink)]">{peran}</dd>
        </dl>
      </section>

      <section aria-labelledby="akun-password" className="space-y-1">
        <Subjudul id="akun-password">{t.password.judul}</Subjudul>
        <p className="text-sm text-[var(--ink-muted)]">{t.password.keterangan}</p>
        <FormPassword />
      </section>

      <section aria-labelledby="akun-sesi" className="space-y-1">
        <Subjudul id="akun-sesi">{t.sesi.judul}</Subjudul>
        <div className="mt-3 flex flex-col gap-3 border-y border-[var(--line)] py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--ink-muted)]">{t.sesi.keterangan}</p>
          <Button variant="danger" onClick={logout} className="shrink-0 self-start sm:self-auto">
            {t.sesi.keluar}
          </Button>
        </div>
      </section>
    </div>
  );
}
