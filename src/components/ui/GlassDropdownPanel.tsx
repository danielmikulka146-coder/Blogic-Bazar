"use client";

import { Check, Square, SquareCheck } from "lucide-react";
import { useState } from "react";

// Konstanty si necháváme kvůli back-compat s callery (GlassSelect, ...). Hodnoty
// se nyní používají jen pro odhad rozměrů u option listů.
export const OPTION_HEIGHT = 36;
export const PANEL_PADDING = 12;
export const GAP = 6;
export const MAX_LIST_HEIGHT = 280;

const INK = "#1a1a1a";
const CREAM = "#F4EFE3";
const ORANGE = "#FF5722";

/**
 * Halftone-styled single-select položka. Dříve uvnitř LiquidGlass panelu,
 * nyní jen plochý mono button s INK / CREAM / ORANGE hover/active stavy.
 */
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
  const bg = selected ? CREAM : hover ? CREAM : "transparent";
  const color = selected ? ORANGE : INK;

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
        color,
        background: bg,
        transition: "background-color 0.15s, color 0.15s",
        borderRadius: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 13,
        fontWeight: selected ? 700 : 500,
        border: "none",
        textAlign: "left",
        fontFamily: "var(--font-jb-mono), 'Courier New', ui-monospace, monospace",
        letterSpacing: "0.04em",
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
  const bg = hover ? CREAM : "transparent";
  const Icon = checked ? SquareCheck : Square;
  const color = checked ? ORANGE : INK;

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
        color,
        background: bg,
        transition: "background-color 0.15s, color 0.15s",
        borderRadius: 0,
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 13,
        fontWeight: checked ? 700 : 500,
        border: "none",
        textAlign: "left",
        fontFamily: "var(--font-jb-mono), 'Courier New', ui-monospace, monospace",
        letterSpacing: "0.04em",
      }}
    >
      <Icon size={16} style={{ flexShrink: 0, opacity: checked ? 1 : 0.5 }} />
      <span>{value}</span>
    </button>
  );
}

/** Tenký dotted separátor mezi položkami. */
export function ReactiveSeparator() {
  return (
    <div
      aria-hidden="true"
      style={{
        height: 0,
        margin: "1px 8px",
        borderTop: `1px dotted ${INK}`,
        opacity: 0.25,
        pointerEvents: "none",
      }}
    />
  );
}
