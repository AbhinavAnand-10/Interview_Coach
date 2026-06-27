// ─────────────────────────────────────────────────────────────────────────────
// lib/api.ts
//
// Typed API client for the FastAPI backend.
//
// Security model:
//   • Access token  → stored in memory (React context). Never in localStorage.
//   • Refresh token → HttpOnly cookie managed entirely by the browser.
//
// On a 401 response, the client automatically calls /auth/refresh to get a
// new access token, then retries the original request once.
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Module-level token store (in-memory, wiped on page refresh → refresh endpoint handles revival)
let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { skipAuth = false, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string>),
  };

  if (!skipAuth && _accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers,
    credentials: "include",   // Required for the HttpOnly refresh token cookie
  });

  // ── Auto-refresh on 401 ───────────────────────────────────────────────────
  if (res.status === 401 && !skipAuth) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      // Retry the original request once with the new token
      headers["Authorization"] = `Bearer ${_accessToken}`;
      const retry = await fetch(`${BASE_URL}${path}`, {
        ...rest,
        headers,
        credentials: "include",
      });
      if (!retry.ok) throw new ApiError(retry.status, await retry.json());
      return retry.json() as Promise<T>;
    } else {
      // Refresh failed — clear token so AuthProvider can redirect to login
      setAccessToken(null);
      throw new ApiError(401, { detail: "Session expired. Please log in again." });
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new ApiError(res.status, body);
  }

  // 204 No Content — return empty object
  if (res.status === 204) return {} as T;

  return res.json() as Promise<T>;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const data = await apiFetch<TokenResponse>("/auth/refresh", {
      method: "POST",
      skipAuth: true,
    });
    setAccessToken(data.access_token);
    return true;
  } catch {
    return false;
  }
}

// ── Custom error class ────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: { detail?: string; [key: string]: unknown }
  ) {
    super(body.detail ?? `HTTP ${status}`);
    this.name = "ApiError";
  }
}

// ── Response types ────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  username: string;
  full_name: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

// ── Auth endpoints ────────────────────────────────────────────────────────────

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export async function register(payload: RegisterPayload): Promise<{ message: string }> {
  return apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuth: true,
  });
}

export interface LoginPayload {
  email: string;
  password: string;
  remember_me: boolean;
}

export async function login(payload: LoginPayload): Promise<TokenResponse> {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
    skipAuth: true,
  });
}

export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
  setAccessToken(null);
}

export async function getMe(): Promise<UserProfile> {
  return apiFetch("/auth/me");
}

export async function refreshToken(): Promise<TokenResponse> {
  return apiFetch("/auth/refresh", { method: "POST", skipAuth: true });
}
