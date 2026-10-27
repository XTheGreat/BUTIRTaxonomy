"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AuthShell from "@/components/layout/AuthShell";
import { useTeks } from "@/lib/teks";

export default function ResetPasswordPage() {
  const t = useTeks();
  const r = t.auth.resetPassword;
  const [token, setToken] = useState<string | null>(null);
  const [siap, setSiap] = useState(false);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selesai, setSelesai] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
    setSiap(true);
  }, []);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage(r.tautanTerkirim);
    } catch (err: any) {
      setError(err.message || r.gagalProses);
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      setSelesai(true);
    } catch (err: any) {
      setError(err.message || r.gagalPerbarui);
    } finally {
      setLoading(false);
    }
  }

  const modeReset = siap && !!token;

  return (
    <AuthShell
      denganFooterSitus
      title={r.judul}
      subtitle={
        modeReset
          ? r.subjudulReset
          : r.subjudulMinta
      }
      footer={
        <div>
          <Link
            href="/login"
            className="text-[var(--ink-muted)] hover:text-[var(--ink)] hover:underline"
          >
            {r.kembaliKeMasuk}
          </Link>
        </div>
      }
    >
      {!siap ? null : selesai ? (
        <div className="flex flex-col gap-4">
          <div className="p-2.5 text-xs leading-relaxed text-[var(--status-diterima)]">
            {r.berhasil}
          </div>
          <Link href="/login">
            <Button className="w-full">{r.keHalamanMasuk}</Button>
          </Link>
        </div>
      ) : modeReset ? (
        <form onSubmit={handleReset} className="flex flex-col gap-4">
          <Input
            label={r.passwordBaru}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={r.passwordPlaceholder}
            minLength={8}
            helper={r.passwordBantuan}
            autoComplete="new-password"
            required
          />
          {error && (
            <div className="p-2.5 text-xs leading-relaxed text-[var(--status-ditolak)]">
              {error}{" "}
              <Link href="/reset-password" className="underline">
                {r.mintaTautanBaru}
              </Link>
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? r.menyimpan : r.simpanPasswordBaru}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleRequest} className="flex flex-col gap-4">
          <Input
            label={r.emailTerdaftar}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={r.emailContoh}
            autoComplete="email"
            required
          />
          {error && (
            <div className="p-2.5 text-xs leading-relaxed text-[var(--status-ditolak)]">
              {error}
            </div>
          )}
          {message && (
            <div className="p-2.5 text-xs leading-relaxed text-[var(--status-diterima)]">
              {message}
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? r.mengirim : r.kirimTautan}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
