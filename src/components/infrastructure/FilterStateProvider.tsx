"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

type FilterStateValue = {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  headerSlot: ReactNode | null;
  setHeaderSlot: (node: ReactNode | null) => void;
  headerSlotRight: ReactNode | null;
  setHeaderSlotRight: (node: ReactNode | null) => void;
};

const Ctx = createContext<FilterStateValue | null>(null);

export function FilterStateProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [headerSlot, setHeaderSlot] = useState<ReactNode | null>(null);
  const [headerSlotRight, setHeaderSlotRight] = useState<ReactNode | null>(null);
  return (
    <Ctx.Provider
      value={{ searchQuery, setSearchQuery, headerSlot, setHeaderSlot, headerSlotRight, setHeaderSlotRight }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useFilterState() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFilterState must be used inside FilterStateProvider");
  return v;
}
