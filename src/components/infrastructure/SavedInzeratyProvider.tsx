"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toggleSavedInzerat } from "@/app/[locale]/inzeraty/saved-actions";
import { useAuth } from "@/components/infrastructure/AuthProvider";

type SavedValue = {
  ids: Set<number>;
  isSaved: (inzeratId: number) => boolean;
  toggle: (inzeratId: number) => Promise<boolean>;
  loading: boolean;
};

const Ctx = createContext<SavedValue | null>(null);

export function SavedInzeratyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setIds(new Set());
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/saved", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { ids: number[] };
        if (cancelled) return;
        setIds(new Set(data.ids));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isSaved = useCallback((inzeratId: number) => ids.has(inzeratId), [ids]);

  const toggle = useCallback(
    async (inzeratId: number) => {
      // Optimistic update — okamžitě překlopíme stav, server může výsledek opravit.
      const wasSaved = ids.has(inzeratId);
      setIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(inzeratId);
        else next.add(inzeratId);
        return next;
      });
      try {
        const result = await toggleSavedInzerat(inzeratId);
        setIds((prev) => {
          const next = new Set(prev);
          if (result.saved) next.add(inzeratId);
          else next.delete(inzeratId);
          return next;
        });
        return result.saved;
      } catch {
        // Rollback při chybě
        setIds((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.add(inzeratId);
          else next.delete(inzeratId);
          return next;
        });
        return wasSaved;
      }
    },
    [ids],
  );

  const value = useMemo(() => ({ ids, isSaved, toggle, loading }), [ids, isSaved, toggle, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSavedInzeraty() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSavedInzeraty must be used inside SavedInzeratyProvider");
  return v;
}
