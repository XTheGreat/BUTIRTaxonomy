"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { saveToken, saveUser } from "@/lib/auth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AuthShell from "@/components/layout/AuthShell";

export default function RegisterPage() {
  const router = useRouter();
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
      setError(err.message || "Pendaftaran gagal. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      denganFooterSitus
      title="Daftar Akun Guru / Dosen"
      subtitle="Buat akun penguji untuk mulai menyusun dan menelaah naskah soal."
      footer={
        <div>
          Sudah memiliki akun?{" "}
          <Link
            href="/login"
            className="text-[var(--accent)] hover:underline font-medium"
          >
            Masuk ke lembar kerja
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nama Lengkap"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Dra. Siti Aminah, M.Pd."
          required
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@study.id"
          autoComplete="email"
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimal 8 karakter"
          helper="Gunakan minimal 8 karakter kombinasi huruf dan angka"
          minLength={8}
          autoComplete="new-password"
          required
        />
        {error && (
          <div className="p-2.5 text-xs leading-relaxed text-[#A4262C]">
            {error}
          </div>
        )}
        <Button type="submit" disabled={loading} className="w-full mt-2">
          {loading ? "Mendaftarkan..." : "Daftar Akun"}
        </Button>
      </form>
    </AuthShell>
  );
}
