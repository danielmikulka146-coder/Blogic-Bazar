"use client";

import { Heart } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useAuth } from "@/components/infrastructure/AuthProvider";
import { useSavedInzeraty } from "@/components/infrastructure/SavedInzeratyProvider";
import { LiquidGlass } from "@/components/layout/LiquidGlass";

type Props = {
  inzeratId: number;
  /** "icon" — kompaktní kruhové tlačítko (na kartě), "wide" — širší pilulka (na detailu). */
  variant?: "icon" | "wide";
};

// Rose-500 (244, 63, 94) — tint pro „uloženo" stav.
const SAVED_TINT = "244, 63, 94";
const HEART_COLOR = "rgb(244, 63, 94)";

export function SaveButton({ inzeratId, variant = "icon" }: Props) {
  const { user } = useAuth();
  const { isSaved, toggle } = useSavedInzeraty();
  const saved = isSaved(inzeratId);
  const [tooltip, setTooltip] = useState<string | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      setTooltip("Pro uložení se musíš přihlásit");
      window.setTimeout(() => setTooltip(null), 1800);
      return;
    }
    await toggle(inzeratId);
  };

  const ariaLabel = saved ? "Odebrat z uložených" : "Uložit inzerát";

  if (variant === "wide") {
    // Detail stránka — žádný transformed parent → plný LiquidGlass funguje.
    return (
      <motion.button
        type="button"
        onClick={handleClick}
        whileTap={{ scale: 0.96 }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        aria-label={ariaLabel}
        aria-pressed={saved}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          padding: 0,
          display: "block",
          position: "relative",
        }}
      >
        <LiquidGlass
          radius={12}
          glassThickness={50}
          bezelWidth={16}
          refractiveIndex={1.5}
          scaleRatio={0.7}
          blur={1.0}
          specularSaturation={4}
          specularOpacity={0.5}
          tintColor={saved ? SAVED_TINT : "0, 0, 0"}
          tintOpacity={saved ? 0.16 : 0.08}
          innerShadowBlur={10}
          innerShadowSpread={-3}
          outerShadowBlur={20}
          fallbackBlur={16}
          style={{ padding: "10px 14px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--mantine-color-text)",
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            <motion.span
              animate={{ scale: saved ? [1, 1.25, 1] : 1 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              style={{ display: "inline-flex", alignItems: "center" }}
            >
              <Heart size={16} fill={saved ? HEART_COLOR : "none"} color={saved ? HEART_COLOR : "currentColor"} />
            </motion.span>
            <span>{saved ? "Uloženo" : "Uložit"}</span>
          </div>
        </LiquidGlass>
        {tooltip && (
          <span
            style={{
              position: "absolute",
              bottom: "calc(100% + 6px)",
              left: 0,
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 11,
              background: "rgba(0,0,0,0.85)",
              color: "white",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            {tooltip}
          </span>
        )}
      </motion.button>
    );
  }

  // Karta na přehledu — InzeratCard má transform + willChange, takže backdrop-filter:url()
  // (LiquidGlass) sampluje prázdnou vrstvu. Fallbackujeme na CSS-only glass, který v
  // transformed parent stále funguje: rgba bg + jednoduchý backdrop-filter blur + bezel.
  const bg = saved ? "rgba(244, 63, 94, 0.32)" : "rgba(15, 15, 20, 0.5)";
  const borderColor = saved ? "rgba(244, 63, 94, 0.45)" : "rgba(255, 255, 255, 0.22)";

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.08 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
      aria-label={ariaLabel}
      aria-pressed={saved}
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: bg,
        backdropFilter: "blur(14px) saturate(160%)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
        border: `1px solid ${borderColor}`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.25), 0 6px 18px rgba(0,0,0,0.35)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        position: "relative",
        transition: "background 0.18s, border-color 0.18s",
      }}
    >
      <motion.span
        animate={{ scale: saved ? [1, 1.3, 1] : 1 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        style={{
          display: "inline-flex",
          // Heart SVG má těžiště posunuté nahoru kvůli zaoblení v horní části —
          // 1px posun dolů to opticky vystředí v kruhu.
          transform: "translateY(1px)",
          filter: "drop-shadow(0 0 2px rgba(0,0,0,0.7)) drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
        }}
      >
        <Heart size={18} strokeWidth={2.6} fill={saved ? HEART_COLOR : "none"} color={saved ? HEART_COLOR : "white"} />
      </motion.span>
      {tooltip && (
        <span
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            right: 0,
            padding: "4px 8px",
            borderRadius: 6,
            fontSize: 11,
            background: "rgba(0,0,0,0.85)",
            color: "white",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {tooltip}
        </span>
      )}
    </motion.button>
  );
}
