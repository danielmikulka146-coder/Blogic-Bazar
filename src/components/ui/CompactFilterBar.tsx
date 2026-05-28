"use client";

import { CircleDot, Coins, Gift, Package, Tags, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ReactiveCheckOption, ReactiveSeparator } from "./GlassDropdownPanel";
import { PriceRangeControl } from "./PriceRangeControl";

const INK = "#1a1a1a";
const CREAM = "#F4EFE3";
const CARD = "#FBFAF6";
const ORANGE = "#FF5722";
const MONO_STACK = "var(--font-jb-mono), 'Courier New', ui-monospace, monospace";

type Props = {
  kategorie: string[];
  setKategorie: (v: string[]) => void;
  stavy: string[];
  setStavy: (v: string[]) => void;
  stavyZbozi: string[];
  setStavyZbozi: (v: string[]) => void;
  jenZdarma: boolean;
  setJenZdarma: (v: boolean) => void;
  minCena: number | null;
  maxCena: number | null;
  setMinCena: (v: number | null) => void;
  setMaxCena: (v: number | null) => void;
  maxAvailableCena: number;
  allKategorie: string[];
  allStavy: string[];
  allStavyZbozi: string[];
  resetAll: () => void;
  visible?: boolean;
};

type OpenMenu = "kategorie" | "stav" | "stavZbozi" | "cena" | null;

const ICON_SIZE = 16;
const BUTTON_SIZE = 34;

function IconButton({
  children,
  icon,
  count,
  active = false,
  onClick,
}: {
  children?: ReactNode;
  icon: ReactNode;
  count?: number;
  active?: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const bg = active ? ORANGE : hover ? CREAM : CARD;
  const color = active ? "#4A1B0C" : INK;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      style={{
        position: "relative",
        height: BUTTON_SIZE,
        minWidth: BUTTON_SIZE,
        padding: count !== undefined && count > 0 ? "0 8px" : 0,
        background: bg,
        color,
        border: `2px solid ${INK}`,
        borderRadius: 0,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        transition: "background-color 0.15s, color 0.15s",
        fontFamily: MONO_STACK,
      }}
    >
      {icon}
      {count !== undefined && count > 0 && (
        <span
          style={{
            background: active ? "#4A1B0C" : INK,
            color: active ? ORANGE : CARD,
            padding: "0 5px",
            fontSize: 10,
            fontWeight: 700,
            minWidth: 14,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          {count}
        </span>
      )}
      {children}
    </motion.button>
  );
}

function toggle<T>(arr: T[], item: T, set: (v: T[]) => void) {
  if (arr.includes(item)) set(arr.filter((x) => x !== item));
  else set([...arr, item]);
}

function OptionList({
  items,
  selected,
  onToggle,
}: {
  items: string[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  return (
    <div style={{ minWidth: 200, maxHeight: 280, overflowY: "auto" }}>
      {items.map((s, i) => (
        <div key={s}>
          {i > 0 && <ReactiveSeparator />}
          <ReactiveCheckOption value={s} checked={selected.includes(s)} onToggle={() => onToggle(s)} />
        </div>
      ))}
    </div>
  );
}

export function CompactFilterBar({
  kategorie,
  setKategorie,
  stavy,
  setStavy,
  stavyZbozi,
  setStavyZbozi,
  jenZdarma,
  setJenZdarma,
  minCena,
  maxCena,
  setMinCena,
  setMaxCena,
  maxAvailableCena,
  allKategorie,
  allStavy,
  allStavyZbozi,
  resetAll,
  visible = true,
}: Props) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  const cenaActive = minCena != null || maxCena != null;
  const hasAnyActive = kategorie.length > 0 || stavy.length > 0 || stavyZbozi.length > 0 || jenZdarma || cenaActive;
  const open = openMenu !== null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        display: "inline-block",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.2s ease-out",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <IconButton
          icon={<Tags size={ICON_SIZE} />}
          count={kategorie.length}
          active={openMenu === "kategorie" || kategorie.length > 0}
          onClick={() => setOpenMenu((v) => (v === "kategorie" ? null : "kategorie"))}
        />
        <IconButton
          icon={<CircleDot size={ICON_SIZE} />}
          count={stavy.length}
          active={openMenu === "stav" || stavy.length > 0}
          onClick={() => setOpenMenu((v) => (v === "stav" ? null : "stav"))}
        />
        <IconButton
          icon={<Package size={ICON_SIZE} />}
          count={stavyZbozi.length}
          active={openMenu === "stavZbozi" || stavyZbozi.length > 0}
          onClick={() => setOpenMenu((v) => (v === "stavZbozi" ? null : "stavZbozi"))}
        />
        <IconButton
          icon={<Coins size={ICON_SIZE} />}
          count={cenaActive ? 1 : 0}
          active={openMenu === "cena" || cenaActive}
          onClick={() => setOpenMenu((v) => (v === "cena" ? null : "cena"))}
        />
        <IconButton icon={<Gift size={ICON_SIZE} />} active={jenZdarma} onClick={() => setJenZdarma(!jenZdarma)} />
        {hasAnyActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", bounce: 0.35, duration: 0.4 }}
            style={{ display: "inline-flex" }}
          >
            <IconButton icon={<X size={ICON_SIZE} />} onClick={resetAll} />
          </motion.div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              minWidth: 220,
              background: CARD,
              border: `2px dotted ${INK}`,
              borderRadius: 0,
              padding: 6,
              zIndex: 100,
            }}
          >
            {openMenu === "kategorie" && (
              <OptionList
                items={allKategorie}
                selected={kategorie}
                onToggle={(k) => toggle(kategorie, k, setKategorie)}
              />
            )}
            {openMenu === "stav" && (
              <OptionList items={allStavy} selected={stavy} onToggle={(s) => toggle(stavy, s, setStavy)} />
            )}
            {openMenu === "stavZbozi" && (
              <OptionList
                items={allStavyZbozi}
                selected={stavyZbozi}
                onToggle={(s) => toggle(stavyZbozi, s, setStavyZbozi)}
              />
            )}
            {openMenu === "cena" && (
              <PriceRangeControl
                minCena={minCena}
                maxCena={maxCena}
                setMinCena={setMinCena}
                setMaxCena={setMaxCena}
                maxAvailable={maxAvailableCena}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
