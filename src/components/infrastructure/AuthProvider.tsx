// AuthProvider = globální stav přihlášení celé aplikace.
// Pattern "Context + Provider": jeden objekt na nejvyšší úrovni stromu, kdokoli níže ho může přečíst přes useAuth().
"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Tvar dat přihlášeného uživatele — stejná struktura co vrací /api/auth/me a /api/auth/login.
export type AuthUser = {
  id: number;
  email: string;
  name: string;
  picture: string | null; // Google profilová fotka — může chybět
  telefon: string | null;
  telefonPrefix: string | null;
};

// Co context poskytuje — funkce i data. Kdokoli volá useAuth() dostane tento objekt.
type AuthValue = {
  user: AuthUser | null; // null = nepřihlášen (nebo se ještě načítá)
  loading: boolean;
  signInWithCredential: (credential: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

// createContext vytvoří "kanál" — Provider nahoře data posílá, useContext níže je přijímá.
const Ctx = createContext<AuthValue | null>(null);

function InnerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true); // true dokud se nenačte stav z cookie

  // Zkontroluje session cookie na serveru a načte aktuálního uživatele.
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" }); // no-store = vždy čerstvá data, bez cache
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = (await res.json()) as { user: AuthUser | null };
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false); // i při chybě přestaneme zobrazovat loading stav
    }
  }, []);

  // Při startu aplikace zkontrolujeme, jestli má uživatel platnou session cookie.
  useEffect(() => {
    void refresh(); // void = záměrně ignorujeme Promise (neočekáváme return value)
  }, [refresh]);

  // Zavolá login endpoint s Google credential tokenem a uloží uživatele do stavu.
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
    setUser(data.user); // okamžitě aktualizujeme UI — žádný reload stránky
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }); // smaže session cookie na serveru
    setUser(null); // okamžitě skryjeme uživatelské UI
  }, []);

  // useMemo = objekt se nevytváří znovu při každém renderu.
  // Bez toho by každý render způsobil re-render všech komponent používajících useAuth().
  const value = useMemo(
    () => ({ user, loading, signInWithCredential, signOut, refresh }),
    [user, loading, signInWithCredential, signOut, refresh],
  );

  // Ctx.Provider = "vysílač" — value je dostupná všem potomkům přes useContext(Ctx).
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    // Bez client ID nemůžeme provider mountnout, ale stránka se nesmí rozbít —
    // useAuth vrátí prázdný stav a UI zobrazí instrukce v dropdownu / loginu.
    return <InnerAuthProvider>{children}</InnerAuthProvider>;
  }
  // GoogleOAuthProvider inicializuje Google SDK s naším client ID.
  // Musí obalovat InnerAuthProvider, aby Google tlačítko fungovalo.
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <InnerAuthProvider>{children}</InnerAuthProvider>
    </GoogleOAuthProvider>
  );
}

// Custom hook — zabalí useContext a přidá error pokud někdo zapomněl přidat AuthProvider do stromu.
export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
