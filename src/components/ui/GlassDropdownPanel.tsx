"use client";

import { Check, Square, SquareCheck } from "lucide-react";
import { motion } from "motion/react";
import { type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LiquidGlass } from "@/components/layout/LiquidGlass";

export const OPTION_HEIGHT = 36;
export const PANEL_PADDING = 12;
export const GAP = 6;
export const MAX_LIST_HEIGHT = 280;

type Placement = "down" | "up";

type Props = {
  triggerRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  /** Odhad výšky panelu (pro flip logiku) */
  estimatedHeight: number;
  /** Extra vertikální mezera od triggeru. Default: GAP (6px). */
  offset?: number;
  children: ReactNode;
};

/**
 * Sdílený dropdown panel pro GlassSelect / GlassAutocomplete.
 * Stará se o portal, pozici (auto-flip), motion animace (spring + bounce),
 * LiquidGlass wrapper.
 */
export function GlassDropdownPanel({ triggerRef, open, onClose, estimatedHeight, offset = GAP, children }: Props) {
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [placement, setPlacement] = useState<Placement>("down");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Inicializace rect i bez otevření — panel se vykreslí jako "studený" off-screen
  // (opacity 0, pointer-events: none) hned jak je trigger v DOMu. LiquidGlass tím
  // dostane šanci spočítat SVG displacement mapu ještě před tím, než user klikne,
  // takže první otevření je okamžité (žádný "snap into existence" efekt).
  useEffect(() => {
    if (!mounted || rect) return;
    const init = () => {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setRect(r);
    };
    init();
    const id = window.requestAnimationFrame(init);
    return () => window.cancelAnimationFrame(id);
  }, [mounted, rect, triggerRef]);

  useEffect(() => {
    if (!open) return;

    const updateRect = () => {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      setRect(r);

      const spaceBelow = window.innerHeight - r.bottom - GAP;
      const spaceAbove = r.top - GAP;

      if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
        setPlacement("up");
      } else {
        setPlacement("down");
      }
    };
    updateRect();

    const onScroll = () => updateRect();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);

    const onMouseDown = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      if (dropdownRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", onMouseDown);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, estimatedHeight, triggerRef, onClose]);

  if (!mounted) return null;

  // I bez rect mountujeme LiquidGlass off-screen, aby měl čas vygenerovat
  // displacement mapu a dekódovat feImage ještě před prvním otevřením.
  const positionStyle: React.CSSProperties = rect
    ? {
        ...(placement === "down" ? { top: rect.bottom + offset } : { bottom: window.innerHeight - rect.top + offset }),
        left: rect.left,
        minWidth: rect.width,
      }
    : { top: -9999, left: -9999 };

  return createPortal(
    <motion.div
      ref={dropdownRef}
      variants={{
        closed: {
          opacity: 0,
          scale: 0.97,
          transition: { duration: 0.1, ease: "easeOut" },
        },
        open: {
          opacity: 1,
          scale: 1,
          transition: { duration: 0.18, ease: [0.2, 0.7, 0.3, 1] },
        },
      }}
      initial="closed"
      animate={open && rect ? "open" : "closed"}
      style={{
        position: "fixed",
        ...positionStyle,
        width: "max-content",
        zIndex: 1000,
        transformOrigin: placement === "down" ? "top center" : "bottom center",
        pointerEvents: open && rect ? "auto" : "none",
      }}
    >
      <LiquidGlass
        radius={14}
        glassThickness={60}
        bezelWidth={20}
        refractiveIndex={1.5}
        scaleRatio={0.7}
        blur={1.0}
        specularSaturation={4}
        specularOpacity={0.6}
        tintColor="0, 0, 0"
        tintOpacity={0.08}
        innerShadowBlur={15}
        innerShadowSpread={-4}
        outerShadowBlur={32}
        fallbackBlur={20}
        style={{ padding: 6 }}
      >
        {children}
      </LiquidGlass>
    </motion.div>,
    document.body,
  );
}

/* ─── Sdílené prvky uvnitř dropdownu ─── */
// Pozn.: Názvy si nechávají "Reactive*" prefix kvůli stabilitě importů z volajícího kódu.
// Dynamic luminance sample je odstraněn — místo toho jede dark-glass backdrop
// (brightness 0.85 v LiquidGlass) + bílé fronty/separátory napevno.

/** Single-select položka. */
export function ReactiveOption({
  value,
  selected,
  onSelect,
}: {
  value: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const [hover, setHover] = useState(false);
  const bg = selected ? "var(--glass-active-bg)" : hover ? "var(--glass-hover-bg)" : "transparent";

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        padding: "8px 12px",
        cursor: "pointer",
        color: "var(--mantine-color-text)",
        background: bg,
        transition: "background-color 0.15s",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 14,
        border: "none",
        textAlign: "left",
        fontFamily: "inherit",
      }}
    >
      <span>{value}</span>
      {selected && <Check size={14} />}
    </button>
  );
}

/** Multi-select varianta — vlevo checkbox, klik toggluje. */
export function ReactiveCheckOption({
  value,
  checked,
  onToggle,
}: {
  value: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const [hover, setHover] = useState(false);
  const bg = hover ? "var(--glass-hover-bg)" : "transparent";
  const Icon = checked ? SquareCheck : Square;

  return (
    <button
      type="button"
      role="option"
      aria-selected={checked}
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        padding: "8px 12px",
        cursor: "pointer",
        color: "var(--mantine-color-text)",
        background: bg,
        transition: "background-color 0.15s",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 14,
        border: "none",
        textAlign: "left",
        fontFamily: "inherit",
      }}
    >
      <Icon size={16} style={{ flexShrink: 0, opacity: checked ? 1 : 0.5 }} />
      <span>{value}</span>
    </button>
  );
}

/** Tenký separátor mezi položkami. */
export function ReactiveSeparator() {
  return (
    <div
      aria-hidden="true"
      style={{
        height: 1,
        margin: "1px 10px",
        background: "var(--glass-separator)",
        pointerEvents: "none",
      }}
    />
  );
}
