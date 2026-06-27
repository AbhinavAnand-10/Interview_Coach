"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  getMe,
  login as apiLogin,
  logout as apiLogout,
  refreshToken,
  register as apiRegister,
  setAccessToken,
  type LoginPayload,
  type RegisterPayload,
  type UserProfile,
} from "./api";

// ── Context shape ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Proactive token refresh (every 13 minutes for a 15-minute access token) ─
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const data = await refreshToken();
        setAccessToken(data.access_token);
        scheduleRefresh();
      } catch {
        setUser(null);
        setAccessToken(null);
        router.push("/login");
      }
    }, 13 * 60 * 1000);
  }, [router]);

  // ── On mount: try to revive session via the HttpOnly refresh cookie ──────
  useEffect(() => {
    async function reviveSession() {
      try {
        const data = await refreshToken();
        setAccessToken(data.access_token);
        const profile = await getMe();
        setUser(profile);
        scheduleRefresh();
      } catch {
        // No valid session — user must log in
        setUser(null);
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    }
    reviveSession();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [scheduleRefresh]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (payload: LoginPayload) => {
      const data = await apiLogin(payload);
      setAccessToken(data.access_token);
      const profile = await getMe();
      setUser(profile);
      scheduleRefresh();
      router.push("/dashboard");
    },
    [router, scheduleRefresh]
  );

  // ── Register ──────────────────────────────────────────────────────────────
  const register = useCallback(async (payload: RegisterPayload) => {
    await apiRegister(payload);
    // Don't auto-login after register — redirect to login page
    router.push("/login?registered=true");
  }, [router]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setAccessToken(null);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      router.push("/login");
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
