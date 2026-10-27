import { terjemahkanGalat } from "@/lib/teks/galat";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  kode?: string;
  param?: Record<string, unknown>;
  constructor(message: string, status: number, kode?: string, param?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.kode = kode;
    this.param = param;
  }
}

// Bila server mengirim `kode` yang ada di kamus galat, pesan tampil dalam bahasa aktif;
// selain itu dipakai kalimat `detail` dari server apa adanya.
function bentukApiError(err: any, status: number): ApiError {
  const kode = typeof err?.kode === "string" ? err.kode : undefined;
  const param = err?.param && typeof err.param === "object" ? err.param : undefined;
  const pesan = Array.isArray(err?.detail)
    ? pesanDaftarValidasi(err.detail) || `HTTP ${status}`
    : terjemahkanGalat(kode, param) || pesanGalat(err?.detail) || `HTTP ${status}`;
  return new ApiError(pesan, status, kode, param);
}

// Error validasi 422: tiap butir membawa `type` (kode) dan `ctx` (param) bila dibuat lewat `galat_validasi`.
function pesanDaftarValidasi(daftar: any[]): string {
  return daftar
    .map((d) => {
      const terjemahan = terjemahkanGalat(d?.type, d?.ctx);
      if (terjemahan) return terjemahan;
      return typeof d?.msg === "string" ? d.msg.replace(/^Value error, /, "") : "";
    })
    .filter(Boolean)
    .join(" ");
}

function pesanGalat(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) =>
        typeof d?.msg === "string" ? d.msg.replace(/^Value error, /, "") : ""
      )
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

export async function unduhBerkas(path: string, namaCadangan: string): Promise<void> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Gagal mengunduh berkas." }));
    throw bentukApiError(err, res.status);
  }

  const nama =
    /filename="?([^";]+)"?/i.exec(res.headers.get("Content-Disposition") || "")?.[1] ||
    namaCadangan;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw bentukApiError(err, res.status);
  }

  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}
