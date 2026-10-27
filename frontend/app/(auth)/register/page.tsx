"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { saveToken, saveUser } from "@/lib/auth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AuthShell from "@/components/layout/AuthShell";
import { useTeks } from "@/lib/teks";

export default function RegisterPage() {
  const router = useRouter();
  const t = useTeks();
  const d = t.auth.daftar;
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ nama, email, password }),
      });
      saveToken(data.access_token);
      saveUser(data.user);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || d.gagal);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      denganFooterSitus
      title={d.judul}
      subtitle={d.subjudul}
      footer={
        <div>
          {d.sudahPunyaAkun}{" "}
          <Link
            href="/login"
            className="text-[var(--accent-text)] hover:underline font-medium"
          >
            {d.masukKeLembarKerja}
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label={d.namaLengkap}
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder={d.namaContoh}
          required
        />
        <Input
          label={d.email}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={d.emailContoh}
          autoComplete="email"
          required
        />
        <Input
          label={d.password}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={d.passwordPlaceholder}
          helper={d.passwordBantuan}
          minLength={8}
          autoComplete="new-password"
          required
        />
        {error && (
          <div className="p-2.5 text-xs leading-relaxed text-[var(--status-ditolak)]">
            {error}
          </div>
        )}
        <Button type="submit" disabled={loading} className="w-full mt-2">
          {loading ? d.mendaftarkan : d.tombol}
        </Button>
      </form>
    </AuthShell>
  );
}
