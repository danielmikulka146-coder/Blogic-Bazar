"use client";

import { BadgeCheck, Gift, LayoutGrid, X } from "lucide-react";
import { motion } from "motion/react";
import { type ReactNode, useRef, useState } from "react";
import { LiquidGlass } from "@/components/layout/LiquidGlass";
import { GlassDropdownPanel, ReactiveCheckOption, ReactiveSeparator } from "./GlassDropdownPanel";

type Props = {
  kategorie: string[];
  setKategorie: (v: string[]) => void;
  stavy: string[];
  setStavy: (v: string[]) => void;
  jenZdarma: boolean;
  setJenZdarma: (v: boolean) => void;
  allKategorie: string[];
  allStavy: string[];
  resetAll: () => void;
};

const ICON_SIZE = 18;
const HEIGHT = 48; // ladí s header pillkou

function IconButton({
  children,
  icon,
  count,
  active = false,
  onClick,
  refProp,
}: {
  children?: ReactNode;
  icon: ReactNode;
  count?: number;
  active?: boolean;
  onClick: () => void;
  refProp?: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <motion.button
      ref={refProp}
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

export function CompactFilterBar({
  kategorie,
  setKategorie,
  stavy,
  setStavy,
  jenZdarma,
  setJenZdarma,
  allKategorie,
  allStavy,
  resetAll,
}: Props) {
  const [openMenu, setOpenMenu] = useState<"kategorie" | "stav" | null>(null);
  const kategorieRef = useRef<HTMLButtonElement>(null);
  const stavRef = useRef<HTMLButtonElement>(null);

  const hasAnyActive = kategorie.length > 0 || stavy.length > 0 || jenZdarma;

  return (
    <>
      <LiquidGlass
        radius="pill"
        glassThickness={80}
        bezelWidth={60}
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
        style={{ padding: "7px 8px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton
            refProp={kategorieRef}
            icon={<LayoutGrid size={ICON_SIZE} />}
            count={kategorie.length}
            active={openMenu === "kategorie" || kategorie.length > 0}
            onClick={() => setOpenMenu((v) => (v === "kategorie" ? null : "kategorie"))}
          />
          <IconButton
            refProp={stavRef}
            icon={<BadgeCheck size={ICON_SIZE} />}
            count={stavy.length}
            active={openMenu === "stav" || stavy.length > 0}
            onClick={() => setOpenMenu((v) => (v === "stav" ? null : "stav"))}
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
      </LiquidGlass>

      <GlassDropdownPanel
        triggerRef={kategorieRef}
        open={openMenu === "kategorie"}
        onClose={() => setOpenMenu(null)}
        estimatedHeight={Math.min(280, allKategorie.length * 36 + 12)}
        offset={16}
      >
        <div style={{ minWidth: 200, maxHeight: 280, overflowY: "auto" }}>
          {allKategorie.map((k, i) => (
            <div key={k}>
              {i > 0 && <ReactiveSeparator />}
              <ReactiveCheckOption
                value={k}
                checked={kategorie.includes(k)}
                onToggle={() => toggle(kategorie, k, setKategorie)}
              />
            </div>
          ))}
        </div>
      </GlassDropdownPanel>

      <GlassDropdownPanel
        triggerRef={stavRef}
        open={openMenu === "stav"}
        onClose={() => setOpenMenu(null)}
        estimatedHeight={Math.min(280, allStavy.length * 36 + 12)}
        offset={16}
      >
        <div style={{ minWidth: 200, maxHeight: 280, overflowY: "auto" }}>
          {allStavy.map((s, i) => (
            <div key={s}>
              {i > 0 && <ReactiveSeparator />}
              <ReactiveCheckOption value={s} checked={stavy.includes(s)} onToggle={() => toggle(stavy, s, setStavy)} />
            </div>
          ))}
        </div>
      </GlassDropdownPanel>
    </>
  );
}
