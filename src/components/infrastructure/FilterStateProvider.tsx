"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

type FilterStateValue = {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  headerSlot: ReactNode | null;
  setHeaderSlot: (node: ReactNode | null) => void;
  /** Slot je mountnutý (LiquidGlass cache zůstává), ale opticky ho schováme.
   * Header dle toho posune hlavní pilulku mezi centrem a off-center pozicí. */
  headerSlotActive: boolean;
  setHeaderSlotActive: (active: boolean) => void;
  headerSlotRight: ReactNode | null;
  setHeaderSlotRight: (node: ReactNode | null) => void;
  /** Stejné jako headerSlotActive, ale pro pravý slot (cenová pilulka na detailu). */
  headerSlotRightActive: boolean;
  setHeaderSlotRightActive: (active: boolean) => void;
};

const Ctx = createContext<FilterStateValue | null>(null);

export function FilterStateProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [headerSlot, setHeaderSlot] = useState<ReactNode | null>(null);
  const [headerSlotActive, setHeaderSlotActive] = useState(false);
  const [headerSlotRight, setHeaderSlotRight] = useState<ReactNode | null>(null);
  const [headerSlotRightActive, setHeaderSlotRightActive] = useState(false);
  return (
    <Ctx.Provider
      value={{
        searchQuery,
        setSearchQuery,
        headerSlot,
        setHeaderSlot,
        headerSlotActive,
        setHeaderSlotActive,
        headerSlotRight,
        setHeaderSlotRight,
        headerSlotRightActive,
        setHeaderSlotRightActive,
      }}
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
