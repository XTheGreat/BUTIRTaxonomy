import { User } from "./types";
import { API_URL } from "./api";

export function saveToken(token: string) {
  localStorage.setItem("token", token);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function saveUser(user: User) {
  localStorage.setItem("user", JSON.stringify(user));
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem("user");
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function logout() {
  const token = getToken();
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  if (token) {
    try {
      await Promise.race([
        fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          keepalive: true,
        }),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch {}
  }
  // Muat ulang penuh, bukan router.push, agar seluruh state klien ikut bersih.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/login";
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
