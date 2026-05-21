"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { LiquidGlass } from "@/components/layout/LiquidGlass";

type Props = {
  label: string;
  /** Počet aktivních filtrů (zobrazí se jako badge) */
  activeCount?: number;
  /** Toggle režim — bez dropdownu, klik jen toggluje active stav */
  asToggle?: boolean;
  active?: boolean;
  onToggle?: () => void;
  /** Obsah dropdownu (multi-select options atd.) */
  children?: ReactNode;
  /** Minimální šířka panelu při otevření — ať se text options vejde */
  panelMinWidth?: number;
};

function ChipHeader({
  label,
  activeCount,
  asToggle,
  open,
}: {
  label: string;
  activeCount: number;
  asToggle: boolean;
  open: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        color: "var(--mantine-color-text)",
        fontSize: 13,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      <span>{label}</span>
      {!asToggle && activeCount > 0 && (
        <span
          style={{
            background: "var(--glass-badge-bg)",
            borderRadius: 10,
            padding: "1px 7px",
            fontSize: 11,
            fontWeight: 600,
            minWidth: 18,
            textAlign: "center",
          }}
        >
          {activeCount}
        </span>
      )}
      {!asToggle && (
        <ChevronDown
          size={14}
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        />
      )}
    </div>
  );
}

export function FilterChip({
  label,
  activeCount = 0,
  asToggle = false,
  active = false,
  onToggle,
  children,
  panelMinWidth = 220,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isActive = asToggle ? active : activeCount > 0;

  // Click outside / Escape
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleClick = () => {
    if (asToggle) onToggle?.();
    else setOpen((o) => !o);
  };

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      {/* Spacer — drží layout slot pro zavřený chip (sourozenci v Group se neposunou) */}
      <div aria-hidden="true" style={{ visibility: "hidden", padding: "6px 14px" }}>
        <ChipHeader label={label} activeCount={activeCount} asToggle={asToggle} open={false} />
      </div>

      {/* Skutečný chip — absolute, roste na open */}
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
          radius={20}
          glassThickness={50}
          bezelWidth={16}
          refractiveIndex={1.5}
          scaleRatio={0.7}
          blur={1.0}
          specularSaturation={4}
          specularOpacity={0.5}
          tintColor={isActive ? "253, 126, 20" : "0, 0, 0"}
          tintOpacity={isActive ? 0.18 : 0.08}
          innerShadowBlur={10}
          innerShadowSpread={-3}
          outerShadowBlur={20}
          fallbackBlur={16}
        >
          <motion.button
            type="button"
            onClick={handleClick}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: "6px 14px",
              width: "100%",
              display: "block",
              textAlign: "left",
            }}
          >
            <ChipHeader label={label} activeCount={activeCount} asToggle={asToggle} open={open} />
          </motion.button>

          <AnimatePresence initial={false}>
            {open && children && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.08, duration: 0.2 } }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                style={{
                  minWidth: panelMinWidth,
                  padding: "4px 6px 6px",
                }}
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>
        </LiquidGlass>
      </motion.div>
    </div>
  );
}
