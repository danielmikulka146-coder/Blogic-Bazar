"use client";

import { Modal } from "@mantine/core";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import NextImage from "next/image";
import { useCallback, useEffect, useState } from "react";

const INK = "#1a1a1a";
const ORANGE = "#FF5722";
const FALLBACK_BG = "#FBFAF6";

type Props = {
  fotky: string[];
  nazev: string;
};

function EmptyState() {
  return (
    <div
      style={{
        aspectRatio: "4/3",
        width: "100%",
        position: "relative",
        overflow: "hidden",
        borderRadius: 0,
        background: FALLBACK_BG,
        border: `2px dotted ${INK}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#6b6b6b",
        fontSize: 14,
      }}
    >
      <ImageIcon size={64} strokeWidth={1.2} />
    </div>
  );
}

function GlassPill({
  children,
  onClick,
  ariaLabel,
  side,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  side?: "left" | "right";
}) {
  const positional: React.CSSProperties = side
    ? {
        position: "absolute",
        top: "50%",
        [side]: 12,
        transform: "translateY(-50%)",
        zIndex: 3,
      }
    : { position: "absolute", bottom: 12, right: 14, zIndex: 3 };

  const content = (
    <div
      style={{
        padding: side ? "8px 10px" : "4px 9px",
        borderRadius: 0,
        background: INK,
        border: `2px solid ${INK}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#F4EFE3",
      }}
    >
      {children}
    </div>
  );

  if (!onClick) {
    return <div style={positional}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={ariaLabel}
      style={{ ...positional, border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
    >
      {content}
    </button>
  );
}

export function FotoGalerie({ fotky, nazev }: Props) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const total = fotky.length;
  const hasMany = total > 1;

  const next = useCallback(() => setActive((i) => (i + 1) % total), [total]);
  const prev = useCallback(() => setActive((i) => (i - 1 + total) % total), [total]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, next, prev]);

  if (total === 0) return <EmptyState />;

  const aktualni = fotky[active];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Hlavní 4:3 obrázek */}
      {/* biome-ignore lint/a11y/useSemanticElements: obsahuje vnořená GlassPill tlačítka, nemůže být <button> */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setLightbox(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setLightbox(true);
        }}
        aria-label="Zobrazit fotku v plné velikosti"
        style={{
          position: "relative",
          aspectRatio: "4/3",
          width: "100%",
          borderRadius: 0,
          overflow: "hidden",
          background: FALLBACK_BG,
          border: `2px dotted ${INK}`,
          padding: 0,
          cursor: "zoom-in",
          display: "block",
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={aktualni}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ position: "absolute", inset: 0 }}
          >
            <NextImage
              src={aktualni}
              alt={`${nazev} – fotka ${active + 1}`}
              fill
              sizes="(max-width: 900px) 100vw, 540px"
              style={{ objectFit: "cover" }}
              priority
            />
          </motion.div>
        </AnimatePresence>

        {hasMany && (
          <>
            <GlassPill side="left" ariaLabel="Předchozí fotka" onClick={prev}>
              <ChevronLeft size={20} color="white" />
            </GlassPill>
            <GlassPill side="right" ariaLabel="Další fotka" onClick={next}>
              <ChevronRight size={20} color="white" />
            </GlassPill>
            <GlassPill>
              <span
                style={{
                  color: "#F4EFE3",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                  fontFamily: "var(--font-jb-mono), 'Courier New', ui-monospace, monospace",
                }}
              >
                {active + 1} / {total}
              </span>
            </GlassPill>
          </>
        )}
      </div>

      {/* Thumbnaily — také 4:3 */}
      {hasMany && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(total, 5)}, 1fr)`,
            gap: 8,
          }}
        >
          {fotky.map((src, i) => {
            const aktivni = i === active;
            return (
              <button
                key={src}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Fotka ${i + 1}`}
                style={{
                  position: "relative",
                  aspectRatio: "4/3",
                  borderRadius: 0,
                  overflow: "hidden",
                  border: aktivni ? `2px solid ${ORANGE}` : `2px dotted ${INK}`,
                  background: FALLBACK_BG,
                  padding: 0,
                  cursor: "pointer",
                  transition: "border-color 0.16s, transform 0.16s",
                  transform: aktivni ? "scale(1.0)" : "scale(0.985)",
                  opacity: aktivni ? 1 : 0.72,
                }}
              >
                <NextImage src={src} alt="" fill sizes="120px" style={{ objectFit: "cover" }} />
              </button>
            );
          })}
        </div>
      )}

      <Modal
        opened={lightbox}
        onClose={() => setLightbox(false)}
        centered
        withCloseButton={false}
        padding={0}
        size="auto"
        radius={0}
        overlayProps={{ backgroundOpacity: 0.85, blur: 12 }}
        styles={{ content: { background: "transparent", boxShadow: "none" } }}
      >
        <div
          style={{
            position: "relative",
            maxWidth: "92vw",
            maxHeight: "88vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <NextImage
            src={aktualni}
            alt={`${nazev} – fotka ${active + 1}`}
            width={1600}
            height={1200}
            sizes="92vw"
            style={{
              width: "auto",
              height: "auto",
              maxWidth: "92vw",
              maxHeight: "88vh",
              objectFit: "contain",
              borderRadius: 0,
              display: "block",
            }}
          />
          {hasMany && (
            <>
              <GlassPill side="left" ariaLabel="Předchozí fotka" onClick={prev}>
                <ChevronLeft size={22} color="white" />
              </GlassPill>
              <GlassPill side="right" ariaLabel="Další fotka" onClick={next}>
                <ChevronRight size={22} color="white" />
              </GlassPill>
              <GlassPill>
                <span
                  style={{
                    color: "white",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {active + 1} / {total}
                </span>
              </GlassPill>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
