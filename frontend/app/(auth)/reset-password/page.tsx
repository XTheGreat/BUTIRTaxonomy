"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AuthShell from "@/components/layout/AuthShell";

export default function ResetPasswordPage() {
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
      setMessage(
        "Jika email terdaftar, tautan untuk mengatur ulang password sudah dikirim. Periksa kotak masuk dan folder spam."
      );
    } catch (err: any) {
      setError(err.message || "Gagal memproses permintaan.");
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
      setError(err.message || "Gagal memperbarui password.");
    } finally {
      setLoading(false);
    }
  }

  const modeReset = siap && !!token;

  return (
    <AuthShell
      denganFooterSitus
      title="Atur Ulang Password"
      subtitle={
        modeReset
          ? "Buat password baru untuk akun Anda."
          : "Masukkan alamat email terdaftar untuk menerima tautan pemulihan."
      }
      footer={
        <div>
          <Link
            href="/login"
            className="text-[var(--ink-muted)] hover:text-[var(--ink)] hover:underline"
          >
            ← Kembali ke halaman masuk
          </Link>
        </div>
      }
    >
      {!siap ? null : selesai ? (
        <div className="flex flex-col gap-4">
          <div className="p-2.5 text-xs leading-relaxed text-[#1F6B3A]">
            Password berhasil diperbarui. Silakan masuk dengan password baru.
          </div>
          <Link href="/login">
            <Button className="w-full">Ke Halaman Masuk</Button>
          </Link>
        </div>
      ) : modeReset ? (
        <form onSubmit={handleReset} className="flex flex-col gap-4">
          <Input
            label="Password Baru"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimal 8 karakter"
            minLength={8}
            helper="Minimal 8 karakter, memuat huruf dan angka"
            autoComplete="new-password"
            required
          />
          {error && (
            <div className="p-2.5 text-xs leading-relaxed text-[#A4262C]">
              {error}{" "}
              <Link href="/reset-password" className="underline">
                Minta tautan baru
              </Link>
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? "Menyimpan..." : "Simpan Password Baru"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleRequest} className="flex flex-col gap-4">
          <Input
            label="Email Terdaftar"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@study.id"
            autoComplete="email"
            required
          />
          {error && (
            <div className="p-2.5 text-xs leading-relaxed text-[#A4262C]">
              {error}
            </div>
          )}
          {message && (
            <div className="p-2.5 text-xs leading-relaxed text-[#1F6B3A]">
              {message}
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? "Mengirim..." : "Kirim Tautan Pemulihan"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
