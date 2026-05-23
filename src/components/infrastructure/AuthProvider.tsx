"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  picture: string | null;
};

type AuthValue = {
  user: AuthUser | null;
  loading: boolean;
  signInWithCredential: (credential: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthValue | null>(null);

function InnerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = (await res.json()) as { user: AuthUser | null };
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signInWithCredential = useCallback(async (credential: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    if (!res.ok) {
      throw new Error("Přihlášení selhalo");
    }
    const data = (await res.json()) as { user: AuthUser };
    setUser(data.user);
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signInWithCredential, signOut, refresh }),
    [user, loading, signInWithCredential, signOut, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    // Bez client ID nemůžeme provider mountnout, ale stránka se nesmí rozbít —
    // useAuth vrátí prázdný stav a UI zobrazí instrukce v dropdownu / loginu.
    return <InnerAuthProvider>{children}</InnerAuthProvider>;
  }
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <InnerAuthProvider>{children}</InnerAuthProvider>
    </GoogleOAuthProvider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
