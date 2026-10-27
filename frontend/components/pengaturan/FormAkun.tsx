"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { ApiError, apiFetch } from "@/lib/api";
import { saveUser } from "@/lib/auth";
import { useTeks } from "@/lib/teks";
import type { User } from "@/lib/types";

interface FormAkunProps {
  user: User;
  onTersimpan: (user: User) => void;
}

export default function FormAkun({ user, onTersimpan }: FormAkunProps) {
  const t = useTeks().akun.pengaturan.akun;
  const [nama, setNama] = useState(user.nama);
  const [email, setEmail] = useState(user.email);
  const [passwordSekarang, setPasswordSekarang] = useState("");
  const [menyimpan, setMenyimpan] = useState(false);
  const [status, setStatus] = useState<{ jenis: "ok" | "galat"; teks: string } | null>(null);

  const namaBerubah = nama.trim() !== user.nama;
  const emailBerubah = email.trim().toLowerCase() !== user.email.toLowerCase();

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!namaBerubah && !emailBerubah) {
      setStatus({ jenis: "galat", teks: t.tanpaPerubahan });
      return;
    }
    setMenyimpan(true);
    setStatus(null);
    try {
      const body: Record<string, string> = {};
      if (namaBerubah) body.nama = nama;
      if (emailBerubah) {
        body.email = email.trim();
        body.password_sekarang = passwordSekarang;
      }
      const data = await apiFetch("/api/auth/saya", { method: "PATCH", body: JSON.stringify(body) });
      const diperbarui: User = { ...user, nama: data.nama, email: data.email };
      saveUser(diperbarui);
      window.dispatchEvent(new Event("user_diperbarui"));
      onTersimpan(diperbarui);
      setNama(diperbarui.nama);
      setEmail(diperbarui.email);
      setPasswordSekarang("");
      setStatus({ jenis: "ok", teks: t.tersimpan });
    } catch (err) {
      setStatus({ jenis: "galat", teks: err instanceof ApiError ? err.message : t.gagal });
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <form onSubmit={simpan} className="mt-3 space-y-4 border-y border-[var(--line)] py-5">
      <Input
        id="pengaturan-nama"
        label={t.nama}
        value={nama}
        onChange={(e) => setNama(e.target.value)}
        autoComplete="name"
        required
      />
      <Input
        id="pengaturan-email"
        label={t.email}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        helper={t.bantuan}
        required
      />
      {emailBerubah && (
        <Input
          id="pengaturan-password-konfirmasi"
          label={t.passwordSekarang}
          type="password"
          value={passwordSekarang}
          onChange={(e) => setPasswordSekarang(e.target.value)}
          autoComplete="current-password"
          required
        />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={menyimpan}>
          {menyimpan ? t.menyimpan : t.simpan}
        </Button>
        {status && (
          <p
            role={status.jenis === "galat" ? "alert" : "status"}
            className={`text-sm ${status.jenis === "galat" ? "text-[#A4262C]" : "text-[#1F6B3A]"}`}
          >
            {status.teks}
          </p>
        )}
      </div>
    </form>
  );
}
