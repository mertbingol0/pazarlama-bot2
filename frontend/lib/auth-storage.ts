import type { LoginUser } from "@/lib/api";

const AUTH_STORAGE_KEY = "jefedes-auth";

export type StoredAuth = {
  token: string;
  user: LoginUser;
};

export function saveAuth(auth: StoredAuth) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function loadAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed?.token || !parsed?.user?.username) return null;
    return parsed;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function isAuthenticated(): boolean {
  return loadAuth() !== null;
}
