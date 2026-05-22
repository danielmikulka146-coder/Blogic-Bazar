"use client";

import { BadgeCheck, Gift, LayoutGrid, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { LiquidGlass } from "@/components/layout/LiquidGlass";
import { ReactiveCheckOption, ReactiveSeparator } from "./GlassDropdownPanel";

type Props = {
  kategorie: string[];
  setKategorie: (v: string[]) => void;
  stavy: string[];
  setStavy: (v: string[]) => void;
  stavyZbozi: string[];
  setStavyZbozi: (v: string[]) => void;
  jenZdarma: boolean;
  setJenZdarma: (v: boolean) => void;
  allKategorie: string[];
  allStavy: string[];
  allStavyZbozi: string[];
  resetAll: () => void;
  /** Když false, pilulka je v DOM, ale je opacity 0 a nezachytává klik.
   * LiquidGlass instance zůstává namountovaná → žádný cold-mount snap. */
  visible?: boolean;
};

type OpenMenu = "kategorie" | "stav" | "stavZbozi" | null;

const ICON_SIZE = 18;
const HEIGHT = 48;

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
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      style={{
        position: "relative",
        border: "none",
        cursor: "pointer",
        background: active ? "rgba(253,126,20,0.22)" : "transparent",
        color: "var(--mantine-color-text)",
        height: HEIGHT - 14,
        minWidth: HEIGHT - 14,
        padding: "0 8px",
        borderRadius: 999,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        transition: "background-color 0.15s",
      }}
    >
      {icon}
      {count !== undefined && count > 0 && (
        <span
          style={{
            background: "var(--glass-badge-bg)",
            borderRadius: 10,
            padding: "1px 6px",
            fontSize: 10,
            fontWeight: 600,
            minWidth: 16,
            textAlign: "center",
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

/**
 * Compact filter bar pro header slot. Používá FilterChip-style snap-free LiquidGlass:
 * celá pilulka je jeden LiquidGlass, který morphuje (motion.div layout) když se otevře
 * dropdown — žádný separátní portal panel, žádný cold-mount snap.
 */
export function CompactFilterBar({
  kategorie,
  setKategorie,
  stavy,
  setStavy,
  stavyZbozi,
  setStavyZbozi,
  jenZdarma,
  setJenZdarma,
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

  const hasAnyActive = kategorie.length > 0 || stavy.length > 0 || stavyZbozi.length > 0 || jenZdarma;
  const open = openMenu !== null;

  const TriggerRow = (
    <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "7px 8px" }}>
      <IconButton
        icon={<LayoutGrid size={ICON_SIZE} />}
        count={kategorie.length}
        active={openMenu === "kategorie" || kategorie.length > 0}
        onClick={() => setOpenMenu((v) => (v === "kategorie" ? null : "kategorie"))}
      />
      <IconButton
        icon={<BadgeCheck size={ICON_SIZE} />}
        count={stavy.length}
        active={openMenu === "stav" || stavy.length > 0}
        onClick={() => setOpenMenu((v) => (v === "stav" ? null : "stav"))}
      />
      <IconButton
        icon={<Sparkles size={ICON_SIZE} />}
        count={stavyZbozi.length}
        active={openMenu === "stavZbozi" || stavyZbozi.length > 0}
        onClick={() => setOpenMenu((v) => (v === "stavZbozi" ? null : "stavZbozi"))}
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
  );

  return (
    <motion.div
      ref={containerRef}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{
        position: "relative",
        display: "inline-block",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* Spacer — fixní výška pro layout (header slot se nehýbe, když pilulka roste) */}
      <div aria-hidden="true" style={{ visibility: "hidden" }}>
        {TriggerRow}
      </div>

      {/* Skutečná pilulka — absolute, layout-morph při otevření dropdownu */}
      <motion.div
        layout
        transition={{ type: "spring", bounce: 0.28, duration: 0.5 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          minWidth: "100%",
          zIndex: open ? 100 : 1,
        }}
      >
        <LiquidGlass
          radius={24}
          glassThickness={80}
          bezelWidth={24}
          refractiveIndex={1.5}
          scaleRatio={0.7}
          blur={1.0}
          specularSaturation={4}
          specularOpacity={0.75}
          tintColor="0, 0, 0"
          tintOpacity={0.06}
          innerShadowBlur={10}
          innerShadowSpread={-4}
          outerShadowBlur={28}
          fallbackBlur={18}
        >
          {TriggerRow}

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.08, duration: 0.2 } }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                style={{ padding: "0 6px 8px" }}
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
              </motion.div>
            )}
          </AnimatePresence>
        </LiquidGlass>
      </motion.div>
    </motion.div>
  );
}
