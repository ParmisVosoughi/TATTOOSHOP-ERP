// Centralized HTTP client. Set VITE_API_BASE_URL to use the real Django API (JWT auth).
export const API_BASE_URL = (import.meta.env["VITE_API_BASE_URL"] as string | undefined)?.replace(/\/$/, "") ?? "";
export const USE_MOCK = !API_BASE_URL;

export class ApiError extends Error { constructor(public status: number, message: string) { super(message) } }

type Tokens = { access: string; refresh: string };
const KEY = "erp.tokens";
export const auth = {
  get(): Tokens | null { try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; } },
  set(t: Tokens) { localStorage.setItem(KEY, JSON.stringify(t)); },
  clear() { localStorage.removeItem(KEY); window.dispatchEvent(new Event("auth:logout")); },
};

function message(text: string) {
  try {
    const j = JSON.parse(text);
    const errs = j.errors ? Object.entries(j.errors).map(([k, v]) => `${k}: ${[v].flat().join(" ")}`).join(" | ") : "";
    return [typeof j.detail === "string" ? j.detail : "", errs].filter(Boolean).join(" — ") || text;
  } catch { return text; }
}

async function refresh(): Promise<boolean> {
  const t = auth.get();
  if (!t) return false;
  const res = await fetch(`${API_BASE_URL}/api/auth/refresh/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh: t.refresh }) });
  if (!res.ok) return false;
  const j = await res.json();
  auth.set({ access: j.access, refresh: j.refresh ?? t.refresh });
  return true;
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
  if (!res.ok) throw new ApiError(res.status, res.status === 401 ? "نام کاربری یا رمز عبور نادرست است" : message(await res.text()));
  const j = await res.json();
  auth.set({ access: j.access, refresh: j.refresh });
  return j.user as { name: string; username: string; role: string; permissions: string[] };
}

export async function http<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...(auth.get() ? { Authorization: `Bearer ${auth.get()!.access}` } : {}), ...(init.headers ?? {}) },
  });
  if (res.status === 401 && retry) {
    if (await refresh()) return http<T>(path, init, false);
    auth.clear();
  }
  if (!res.ok) throw new ApiError(res.status, message(await res.text()));
  return res.status === 204 ? (undefined as T) : res.json();
}
