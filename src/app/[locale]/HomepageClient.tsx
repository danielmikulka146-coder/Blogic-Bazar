"use client";

import { Button, Text, Title } from "@mantine/core";
import { vocative } from "czech-vocative";
import { useRef, useState } from "react";
import { useAuth } from "@/components/infrastructure/AuthProvider";
import { HalftoneDivider } from "@/components/ui/HalftoneDivider";
import { Link } from "@/i18n/navigation";
import { InzeratCard } from "./inzeraty/InzeratCard";

const KATEGORIE = ["Elektronika", "Oblečení", "Nábytek", "Sport", "Knihy", "Auto-moto", "Jiné"] as const;

const ORANGE = "#FF5722";
const INK = "#1a1a1a";
const CARD_BG = "#FBFAF6";
const CREAM = "#F4EFE3";
const MONO_STACK = "var(--font-jb-mono), 'Courier New', ui-monospace, monospace";
const CARD_WIDTH = 240;
const SCROLL_STEP = CARD_WIDTH + 16;

type InzeratItem = {
  id: number;
  nazev: string;
  foto: string;
  kategorie: string;
  stav: string;
  stavZbozi: string | null;
  cena: number;
  free: boolean;
};

// Hook pro drag-to-scroll — vrací ref na scroll kontejner a event handlery.
// Klik vs drag se rozlišuje prahovou vzdáleností 5px — kratší pohyb = klik, delší = drag.
function useDragScroll() {
  const ref = useRef<HTMLElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);
  const hasDragged = useRef(false);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!ref.current) return;
    isDragging.current = true;
    hasDragged.current = false;
    startX.current = e.clientX;
    startScrollLeft.current = ref.current.scrollLeft;
    ref.current.style.cursor = "grabbing";
    ref.current.style.userSelect = "none";
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !ref.current) return;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) > 5) hasDragged.current = true;
    ref.current.scrollLeft = startScrollLeft.current - delta;
  };

  const onMouseUp = () => {
    isDragging.current = false;
    if (ref.current) {
      ref.current.style.cursor = "grab";
      ref.current.style.userSelect = "";
    }
  };

  // Zablokuje klik na potomkovi pokud proběhl drag — bez toho by drag otevřel inzerát.
  const onClickCapture = (e: React.MouseEvent) => {
    if (hasDragged.current) {
      e.preventDefault();
      e.stopPropagation();
      hasDragged.current = false;
    }
  };

  return { ref, onMouseDown, onMouseMove, onMouseUp, onClickCapture };
}

export function HomepageClient({ inzeraty }: { inzeraty: InzeratItem[] }) {
  const { user, loading } = useAuth();
  const dragScroll = useDragScroll();

  const firstName = user?.name?.split(" ")[0] ?? null;
  const voc = firstName
    ? (() => {
        try {
          return vocative(firstName);
        } catch {
          return firstName;
        }
      })()
    : null;
  const greeting = loading || !voc ? "Ahoj," : `Ahoj ${voc},`;

  const scrollBy = (dir: 1 | -1) => {
    dragScroll.ref.current?.scrollBy({ left: dir * SCROLL_STEP, behavior: "smooth" });
  };

  return (
    <div style={{ paddingTop: 56, paddingBottom: 96 }}>
      {/* Hero */}
      <section
        style={{
          textAlign: "center",
          padding: "0 24px 72px",
          maxWidth: 760,
          margin: "0 auto",
        }}
      >
        <Title
          order={1}
          style={{
            fontSize: "clamp(2.2rem, 6vw, 4rem)",
            lineHeight: 1.1,
            color: INK,
            marginBottom: 4,
            fontFamily: MONO_STACK,
          }}
        >
          {greeting}
        </Title>
        <Title
          order={1}
          style={{
            fontSize: "clamp(2.2rem, 6vw, 4rem)",
            lineHeight: 1.1,
            color: INK,
            marginBottom: 48,
            fontFamily: MONO_STACK,
          }}
        >
          co dnes hledáš?
        </Title>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <Button component={Link} href="/inzeraty" size="lg" variant="filled" style={{ minWidth: 210 }}>
            Procházet inzeráty
          </Button>
          <Button component={Link} href="/novy-inzerat" size="lg" variant="outline" style={{ minWidth: 210 }}>
            + Přidat inzerát
          </Button>
        </div>
      </section>

      <HalftoneDivider my={8} />

      {/* Nejnovější inzeráty */}
      <section style={{ marginBottom: 72 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 24px",
            marginBottom: 20,
          }}
        >
          <Title order={2} style={{ color: INK, fontSize: "1.35rem", fontFamily: MONO_STACK }}>
            Nejnovější inzeráty
          </Title>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <ArrowButton dir="left" onClick={() => scrollBy(-1)} />
            <ArrowButton dir="right" onClick={() => scrollBy(1)} />
            <Link
              href="/inzeraty"
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: ORANGE,
                textDecoration: "none",
                letterSpacing: "0.06em",
                fontFamily: MONO_STACK,
                textTransform: "uppercase",
                marginLeft: 8,
              }}
            >
              Všechny →
            </Link>
          </div>
        </div>

        <section
          ref={dragScroll.ref}
          aria-label="Nejnovější inzeráty"
          className="scroll-hidden"
          onMouseDown={dragScroll.onMouseDown}
          onMouseMove={dragScroll.onMouseMove}
          onMouseUp={dragScroll.onMouseUp}
          onMouseLeave={dragScroll.onMouseUp}
          onClickCapture={dragScroll.onClickCapture}
          style={{
            display: "flex",
            gap: 16,
            overflowX: "auto",
            paddingLeft: 24,
            paddingRight: 24,
            paddingBottom: 8,
            cursor: "grab",
          }}
        >
          {inzeraty.length === 0 ? (
            <Text c="dimmed" style={{ padding: "24px 0", fontFamily: MONO_STACK }}>
              Zatím tu nic není.
            </Text>
          ) : (
            <>
              {inzeraty.map((inzerat) => (
                <div key={inzerat.id} style={{ flex: "0 0 240px", width: 240, display: "grid" }}>
                  <InzeratCard {...inzerat} />
                </div>
              ))}
              <div
                style={{
                  flex: "0 0 auto",
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 8,
                  paddingRight: 8,
                }}
              >
                <Button component={Link} href="/inzeraty" variant="outline" size="md">
                  Všechny inzeráty →
                </Button>
              </div>
            </>
          )}
        </section>
      </section>

      <HalftoneDivider my={8} />

      {/* Kategorie */}
      <section>
        <Title
          order={2}
          style={{
            color: INK,
            fontSize: "1.35rem",
            fontFamily: MONO_STACK,
            padding: "0 24px",
            marginBottom: 20,
          }}
        >
          Kategorie
        </Title>
        <KategorieRow />
      </section>
    </div>
  );
}

function KategorieRow() {
  const drag = useDragScroll();

  return (
    <section
      ref={drag.ref}
      aria-label="Kategorie"
      className="scroll-hidden"
      onMouseDown={drag.onMouseDown}
      onMouseMove={drag.onMouseMove}
      onMouseUp={drag.onMouseUp}
      onMouseLeave={drag.onMouseUp}
      onClickCapture={drag.onClickCapture}
      style={{
        display: "flex",
        gap: 16,
        overflowX: "auto",
        paddingLeft: 24,
        paddingRight: 24,
        paddingBottom: 8,
        cursor: "grab",
      }}
    >
      {KATEGORIE.map((kat) => (
        <KategorieCard key={kat} kategorie={kat} />
      ))}
    </section>
  );
}

function KategorieCard({ kategorie }: { kategorie: string }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={`/inzeraty?kategorie=${encodeURIComponent(kategorie)}`}
      style={{
        flex: "0 0 160px",
        width: 160,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 110,
        padding: "20px 16px",
        background: hovered ? ORANGE : CARD_BG,
        border: `2px dotted ${hovered ? ORANGE : INK}`,
        textDecoration: "none",
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s, box-shadow 0.15s, color 0.15s",
        boxShadow: hovered ? "0 0 16px rgba(255,87,34,0.4)" : "none",
        color: hovered ? "#FBFAF6" : INK,
        fontWeight: 700,
        fontSize: 13,
        textAlign: "center",
        fontFamily: MONO_STACK,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {kategorie}
    </Link>
  );
}

function ArrowButton({ dir, onClick }: { dir: "left" | "right"; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        background: hovered ? CREAM : "transparent",
        border: `2px dotted ${INK}`,
        borderRadius: 0,
        cursor: "pointer",
        fontFamily: MONO_STACK,
        fontSize: 16,
        fontWeight: 700,
        color: INK,
        transition: "background 0.12s",
        flexShrink: 0,
      }}
    >
      {dir === "left" ? "‹" : "›"}
    </button>
  );
}
