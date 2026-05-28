"use client";

import { Heart } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/infrastructure/AuthProvider";
import { useSavedInzeraty } from "@/components/infrastructure/SavedInzeratyProvider";

type Props = {
  inzeratId: number;
  /** "icon" — kompaktní kruhové tlačítko (na kartě), "wide" — širší pilulka (na detailu). */
  variant?: "icon" | "wide";
};

const INK = "#1a1a1a";
const CREAM = "#F4EFE3";
const CARD = "#FBFAF6";
const ORANGE = "#FF5722";
const HEART_COLOR = ORANGE;

export function SaveButton({ inzeratId, variant = "icon" }: Props) {
  const { user } = useAuth();
  const { isSaved, toggle } = useSavedInzeraty();
  const saved = isSaved(inzeratId);
  const [tooltip, setTooltip] = useState<string | null>(null);
  // Pozice pro portalovaný tooltip (icon varianta sedí uvnitř image containeru
  // s overflow:hidden, takže tooltip přes portal ven na body se neořezává).
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      if (buttonRef.current) {
        const r = buttonRef.current.getBoundingClientRect();
        setTooltipPos({ top: r.top - 8, right: window.innerWidth - r.right });
      }
      setTooltip("Pro uložení se musíš přihlásit");
      window.setTimeout(() => {
        setTooltip(null);
        setTooltipPos(null);
      }, 1800);
      return;
    }
    await toggle(inzeratId);
  };

  const ariaLabel = saved ? "Odebrat z uložených" : "Uložit inzerát";

  if (variant === "wide") {
    return (
      <motion.button
        type="button"
        onClick={handleClick}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        aria-label={ariaLabel}
        aria-pressed={saved}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = CREAM;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = CARD;
        }}
        style={{
          width: "100%",
          padding: "10px 14px",
          background: CARD,
          color: INK,
          border: `2px solid ${INK}`,
          borderRadius: 0,
          cursor: "pointer",
          display: "block",
          position: "relative",
          fontFamily: "inherit",
          transition: "background-color 0.15s",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: INK,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          <motion.span
            animate={{ scale: saved ? [1, 1.25, 1] : 1 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            style={{ display: "inline-flex", alignItems: "center" }}
          >
            <Heart size={16} fill={saved ? HEART_COLOR : "none"} color={saved ? HEART_COLOR : INK} />
          </motion.span>
          <span>{saved ? "Uloženo" : "Uložit"}</span>
        </div>
        {tooltip && (
          <span
            style={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              left: 0,
              padding: "4px 8px",
              borderRadius: 0,
              fontSize: 11,
              background: INK,
              color: CREAM,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 3000,
            }}
          >
            {tooltip}
          </span>
        )}
      </motion.button>
    );
  }

  // Karta na přehledu — halftone styl: čtverec s 2px dotted INK borderem, cream pozadí,
  // oranžové aktivní stavy. Konzistentní s ostatními halftone tlačítky (filter chips, atd.).
  const iconBg = saved ? ORANGE : CARD;
  const iconBorder = INK;
  const heartColor = saved ? "#4A1B0C" : INK;
  const heartFill = saved ? "#4A1B0C" : "none";

  return (
    <>
      <motion.button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={(e) => {
          if (!saved) e.currentTarget.style.background = CREAM;
        }}
        onMouseLeave={(e) => {
          if (!saved) e.currentTarget.style.background = CARD;
        }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 500, damping: 22 }}
        aria-label={ariaLabel}
        aria-pressed={saved}
        style={{
          width: 34,
          height: 34,
          borderRadius: 0,
          background: iconBg,
          border: `2px solid ${iconBorder}`,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          position: "relative",
          transition: "background-color 0.15s",
          fontFamily: "inherit",
        }}
      >
        <motion.span
          animate={{ scale: saved ? [1, 1.3, 1] : 1 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          style={{
            display: "inline-flex",
            // Heart SVG má těžiště posunuté nahoru kvůli zaoblení v horní části.
            transform: "translateY(1px)",
          }}
        >
          <Heart size={16} strokeWidth={2.2} fill={heartFill} color={heartColor} />
        </motion.span>
      </motion.button>
      {mounted &&
        tooltip &&
        tooltipPos &&
        createPortal(
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            style={{
              position: "fixed",
              top: tooltipPos.top,
              right: tooltipPos.right,
              transform: "translateY(-100%)",
              padding: "6px 10px",
              borderRadius: 0,
              fontSize: 11,
              background: INK,
              color: CREAM,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              fontFamily: "var(--font-jb-mono), 'Courier New', ui-monospace, monospace",
              letterSpacing: "0.04em",
              zIndex: 5000,
              border: `2px solid ${INK}`,
            }}
          >
            {tooltip}
          </motion.span>,
          document.body,
        )}
    </>
  );
}
