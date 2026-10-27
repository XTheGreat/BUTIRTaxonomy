"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { ApiError, apiFetch } from "@/lib/api";
import { useTeks } from "@/lib/teks";

export default function FormPassword() {
  const t = useTeks().akun.pengaturan.password;
  const [sekarang, setSekarang] = useState("");
  const [baru, setBaru] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);
  const [status, setStatus] = useState<{ jenis: "ok" | "galat"; teks: string } | null>(null);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setMenyimpan(true);
    setStatus(null);
    try {
      await apiFetch("/api/auth/ganti-password", {
        method: "POST",
        body: JSON.stringify({ password_sekarang: sekarang, password_baru: baru }),
      });
      setSekarang("");
      setBaru("");
      setStatus({ jenis: "ok", teks: t.berhasil });
    } catch (err) {
      setStatus({ jenis: "galat", teks: err instanceof ApiError ? err.message : t.gagal });
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <form onSubmit={simpan} className="mt-3 space-y-4 border-y border-[var(--line)] py-5">
      <Input
        id="pengaturan-password-sekarang"
        label={t.passwordSekarang}
        type="password"
        value={sekarang}
        onChange={(e) => setSekarang(e.target.value)}
        autoComplete="current-password"
        required
      />
      <Input
        id="pengaturan-password-baru"
        label={t.passwordBaru}
        type="password"
        value={baru}
        onChange={(e) => setBaru(e.target.value)}
        autoComplete="new-password"
        helper={t.bantuanBaru}
        minLength={8}
        required
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={menyimpan}>
          {menyimpan ? t.menyimpan : t.simpan}
        </Button>
        {status && (
          <p
            role={status.jenis === "galat" ? "alert" : "status"}
            className={`text-sm ${status.jenis === "galat" ? "text-[var(--status-ditolak)]" : "text-[var(--status-diterima)]"}`}
          >
            {status.teks}
          </p>
        )}
      </div>
    </form>
  );
}
