"use client";

import {
  createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from "react";

interface AuthUser {
  id: number;
  username: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<boolean>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refreshId = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++refreshId.current;
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (!response.ok) throw new Error("无法获取登录状态，请稍后重试。");
      const payload = await response.json() as { user: AuthUser | null };
      if (id !== refreshId.current) return true;
      setUser(payload.user);
      setError("");
      return true;
    } catch (error) {
      if (id !== refreshId.current) return false;
      setUser(null);
      setError(error instanceof Error ? error.message : "无法获取登录状态。");
      return false;
    } finally {
      if (id === refreshId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const update = () => { void refresh(); };
    update();
    window.addEventListener("focus", update);
    const timer = window.setInterval(update, 60_000);
    return () => {
      window.removeEventListener("focus", update);
      window.clearInterval(timer);
    };
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, loading, error, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth 必须在 AuthProvider 内使用。");
  return auth;
}
