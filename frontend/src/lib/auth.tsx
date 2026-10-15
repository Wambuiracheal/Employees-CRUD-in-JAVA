"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, authStorage, setUnauthorizedHandler } from "./api";
import type { AuthResponse, User } from "./types";

interface StoredAuth {
  token: string;
  expiresAt: string;
  user: User;
}

interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  /** False until localStorage has been read on the client. */
  ready: boolean;
  login(email: string, password: string): Promise<void>;
  register(fullName: string, email: string, password: string): Promise<void>;
  logout(reason?: "expired"): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = authStorage.read<StoredAuth>();
    if (stored && new Date(stored.expiresAt).getTime() > Date.now()) {
      setUser(stored.user);
    } else if (stored) {
      authStorage.clear();
    }
    setReady(true);
  }, []);

  const logout = useCallback(
    (reason?: "expired") => {
      authStorage.clear();
      setUser(null);
      router.replace(reason === "expired" ? "/login?expired=1" : "/login");
    },
    [router],
  );

  useEffect(() => {
    setUnauthorizedHandler(() => logout("expired"));
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const persist = (auth: AuthResponse) => {
    authStorage.write({ token: auth.token, expiresAt: auth.expiresAt, user: auth.user } satisfies StoredAuth);
    setUser(auth.user);
  };

  const login = useCallback(async (email: string, password: string) => {
    persist(await api<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }));
  }, []);

  const register = useCallback(async (fullName: string, email: string, password: string) => {
    persist(
      await api<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ fullName, email, password }),
      }),
    );
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAdmin: user?.role === "ADMIN", ready, login, register, logout }),
    [user, ready, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
