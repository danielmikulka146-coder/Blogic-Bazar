"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";

const INK = "#1a1a1a";
const CREAM = "#F4EFE3";
const CARD = "#FBFAF6";
const ORANGE = "#FF5722";
const MONO_STACK = "var(--font-jb-mono), 'Courier New', ui-monospace, monospace";

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
  /** Minimální šířka panelu při otevření */
  panelMinWidth?: number;
};

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
  const [hover, setHover] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isActive = asToggle ? active : activeCount > 0;

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

  const bg = isActive ? ORANGE : hover || open ? CREAM : CARD;
  const color = isActive ? "#4A1B0C" : INK;

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          background: bg,
          color,
          border: `2px solid ${INK}`,
          borderRadius: 0,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          fontFamily: MONO_STACK,
          transition: "background-color 0.15s, color 0.15s",
        }}
      >
        <span>{label}</span>
        {!asToggle && activeCount > 0 && (
          <span
            style={{
              background: isActive ? "#4A1B0C" : INK,
              color: isActive ? ORANGE : CARD,
              padding: "0 6px",
              fontSize: 11,
              fontWeight: 700,
              minWidth: 18,
              textAlign: "center",
              lineHeight: 1.4,
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
      </button>

      <AnimatePresence initial={false}>
        {open && children && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              minWidth: panelMinWidth,
              background: CARD,
              border: `2px dotted ${INK}`,
              borderRadius: 0,
              padding: 6,
              zIndex: 100,
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
