// Karta jednoho inzerátu v gridu — má hover animaci (3D tilt) a easter egg s ASCII kočkami.
// "use client" potřebujeme kvůli useState (tilt transform) a event handlerům (onMouseMove).
"use client";

import { Card, Text, Title } from "@mantine/core";
import Image from "next/image";
import { useRef, useState } from "react";
import { SaveButton } from "@/components/ui/SaveButton";
import { Link } from "@/i18n/navigation";
import { hlavniFotka } from "@/lib/foto";

type InzeratCardProps = {
  id: number;
  nazev: string;
  foto: string;
  kategorie: string;
  stav: string;
  stavZbozi: string | null;
  cena: number;
  free: boolean;
};

// Barva textu stavu podle hodnoty — Record<string, string> = slovník klíč → hodnota.
// Výchozí barva (#6b6b6b) se použije pro neznámé stavy přes operátor ?? níže.
const STATUS_LABEL_COLOR: Record<string, string> = {
  dostupné: "#3B6D11",
  zarezervováno: "#854F0B",
  rezervováno: "#854F0B",
  prodáno: "#6b6b6b",
};

const INK = "#1a1a1a";
const ORANGE = "#FF5722";
const BADGE_TEXT = "#4A1B0C";

// Výchozí CSS transform — karta je rovná (bez náklonu). Uložené jako konstanta, aby se dal
// string snadno znovu použít při onMouseLeave bez opakování.
const RESET_TILT = "perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0)";
const MAX_TILT = 8; // maximální náklon karty ve stupních při hoveru

// ASCII kočka koukající zpod obrázku — zobrazí se náhodně u ~10 % karet (viz seededRand níže).
const CAT_PEEKING = ["    |\\__/,|   (`\\", "  _.|o o  |_   ) )", "-(((---(((--------"].join("\n");

// Různé varianty stojící kočky — která se zobrazí závisí na ID inzerátu (vždy stejná pro stejný inzerát).
const CAT_STANDING_VARIANTS = [
  ["      \\    /\\", "       )  ( ')", "      (  /  )", "       \\(__)|"].join("\n"),
  ["  ^~^  ,", " ('Y') )", " /   \\/", "(\\|||/)"].join("\n"),
  [
    "    /\\_/\\           ___",
    "   = o_o =_______    \\ \\",
    "    __^      __(  \\.__) )",
    "(@)<_____>__(_____)____/",
  ].join("\n"),
  ["     _", "  |\\'/-..--.", " / _ _   ,  ;", "`~=`Y'~_<._./", " <`-....__.' "].join("\n"),
  ["  /\\_/\\  (", " ( ^.^ ) _)", '   \\"/  (', " ( | | )", "(__d b__)"].join("\n"),
  [
    '        ,-""""""-.',
    "     /\\j__/\\  (  \\`--.",
    "     \\`@_@'/  _)  >--.`.",
    "    _{.:Y:_}_{{_,'    ) )",
    "   {_}`-^{_} ```     (_/",
  ].join("\n"),
  [
    "     .       .",
    "     \\`-\"'\"-'/",
    "      } 6 6 {",
    "     =.  Y  ,=",
    '   (""-\'***`-"")',
    "    `-/     \\-'",
    "     (  )-(  )===' ",
    '      ""   ""',
  ].join("\n"),
];

// Deterministický pseudonáhodný generátor — stejné seed+salt vždy vrátí stejné číslo (0–1).
// Díky tomu kočka u inzerátu #42 bude vždy stejná varianta, i po refreshi stránky.
// Math.random() by pokaždé vrátilo jiné číslo — to nechceme.
function seededRand(seed: number, salt: number): number {
  const x = Math.sin(seed * 9301 + salt * 49297 + 1) * 233280;
  return Math.abs(x - Math.floor(x)); // desetinná část = číslo mezi 0 a 1
}

export function InzeratCard({ id, nazev, foto, kategorie, stav, stavZbozi, cena, free }: InzeratCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null); // ref na DOM element karty pro výpočet pozice myši
  const [transform, setTransform] = useState(RESET_TILT); // aktuální CSS transform string pro 3D tilt
  const [isHovered, setIsHovered] = useState(false);

  // Počítá náklon karty podle toho, kde přesně je myš na kartě — levý kraj = náklon doleva atd.
  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect(); // poloha a rozměry karty v okně
    const x = e.clientX - rect.left; // x pozice myši relativně ke kartě
    const y = e.clientY - rect.top;
    // Normalizujeme na rozsah -1 až 1 (střed karty = 0), pak násobíme MAX_TILT pro výsledné stupně.
    const rotY = ((x - rect.width / 2) / (rect.width / 2)) * MAX_TILT;
    const rotX = -((y - rect.height / 2) / (rect.height / 2)) * MAX_TILT; // mínus = přirozený směr
    setTransform(`perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(8px)`);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setTransform(RESET_TILT); // vrátíme kartu do rovné polohy
    setIsHovered(false);
  };

  const statusColor = STATUS_LABEL_COLOR[stav] ?? "#6b6b6b"; // ?? = fallback pokud stav není v mapě
  const isSold = stav === "prodáno";
  const borderColor = isHovered ? ORANGE : INK;

  // Kočka se zobrazí jen u ~10 % karet (seededRand < 0.1) a jen tam, kde je krátký název
  // (stojící kočka by překryla dlouhý text). Salt (1, 2, 3) zajistí různé výsledky pro různé účely.
  const showStanding = nazev.length < 13 && seededRand(id, 1) < 0.1;
  const standingVariant = CAT_STANDING_VARIANTS[Math.floor(seededRand(id, 3) * CAT_STANDING_VARIANTS.length)];
  const showPeeking = !showStanding && seededRand(id, 2) < 0.1; // buď stojí, nebo kouká — ne obojí

  return (
    // component={Link} = Mantine Card se vykreslí jako <a> tag (Next.js router link), ne jako <div>.
    // Celá karta je tedy klikatelná a vede na detail inzerátu.
    <Card
      ref={cardRef}
      component={Link}
      href={`/inzeraty/${id}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      padding="md"
      radius={0}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        zIndex: isHovered ? 2 : 1,
        transform,
        transition: "transform 0.15s ease-out, border-color 0.15s, box-shadow 150ms ease-out",
        transformStyle: "preserve-3d",
        willChange: "transform",
        textDecoration: "none",
        cursor: "pointer",
        background: "#FBFAF6",
        border: `2px dotted ${borderColor}`,
        boxShadow: isHovered ? "0 0 16px rgba(255, 87, 34, 0.4)" : "none",
        opacity: isSold ? 0.7 : 1,
      }}
    >
      {/* Image container */}
      <div
        style={{
          aspectRatio: "4/3",
          position: "relative",
          overflow: "hidden",
          borderRadius: 0,
          border: `1px dotted ${INK}`,
          flexShrink: 0,
        }}
      >
        {/* hlavniFotka() vezme JSON pole fotek a vrátí URL první — nebo placeholder pokud žádná není. */}
        {/* fill = obrázek vyplní celý parent kontejner (musí mít position: relative a rozměry). */}
        <Image src={hlavniFotka(foto)} alt={nazev} fill style={{ objectFit: "cover" }} />

        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 2 }}>
          <SaveButton inzeratId={id} variant="icon" />
        </div>

        {showPeeking && (
          <pre
            aria-hidden
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              margin: 0,
              fontFamily: "var(--font-jb-mono), 'Courier New', ui-monospace, monospace",
              fontSize: 9,
              lineHeight: "10px",
              color: INK,
              whiteSpace: "pre",
              pointerEvents: "none",
              userSelect: "none",
              // Černý text s bílým glow — text je čitelný a halo ho oddělí
              // od barevného pozadí fotky.
              textShadow:
                "0 0 4px #FFFFFF, 0 0 6px #FFFFFF, 0 0 8px rgba(255,255,255,0.85), 0 0 12px rgba(255,255,255,0.5)",
              zIndex: 2,
            }}
          >
            {CAT_PEEKING}
          </pre>
        )}
      </div>

      {/* Obsah pod obrázkem — overflow:hidden ořízne příliš dlouhé texty (např. gigantické ceny) */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Řádek 1: Kategorie + stavZbozi badges */}
        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          <span
            style={{
              display: "inline-block",
              padding: "3px 8px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              background: ORANGE,
              color: BADGE_TEXT,
              borderRadius: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
            }}
          >
            {kategorie}
          </span>
          {stavZbozi && (
            <span
              style={{
                display: "inline-block",
                padding: "3px 8px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: ORANGE,
                color: BADGE_TEXT,
                borderRadius: 0,
                whiteSpace: "nowrap",
              }}
            >
              {stavZbozi}
            </span>
          )}
        </div>

        {/* Řádek 2: Stav inzerátu */}
        <span
          style={{
            marginTop: 6,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: statusColor,
          }}
        >
          {stav}
        </span>

        <Title
          order={3}
          c={INK}
          mt={8}
          style={{
            fontWeight: 700,
            lineHeight: 1.2,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {nazev}
        </Title>

        {/* Cena — marginTop: auto ji drží na spodku karty když je karta roztažená */}
        {free ? (
          <Text
            fw={700}
            style={{ color: "#3B6D11", marginTop: "auto", paddingTop: 4, whiteSpace: "nowrap", overflow: "hidden" }}
          >
            Zdarma
          </Text>
        ) : (
          <Text fw={700} style={{ marginTop: "auto", paddingTop: 4, whiteSpace: "nowrap", overflow: "hidden" }}>
            <span style={{ color: ORANGE, fontVariantNumeric: "tabular-nums" }}>{cena.toLocaleString("cs-CZ")}</span>{" "}
            <span style={{ fontSize: "0.82em", fontWeight: 600, color: "#444441" }}>Kč</span>
          </Text>
        )}
      </div>
      {/* konec obsahu pod obrázkem */}

      {showStanding && (
        <pre
          aria-hidden
          style={{
            position: "absolute",
            bottom: 12,
            right: 14,
            margin: 0,
            fontFamily: "var(--font-jb-mono), 'Courier New', ui-monospace, monospace",
            fontSize: 9,
            lineHeight: "10px",
            color: INK,
            whiteSpace: "pre",
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 1,
          }}
        >
          {standingVariant}
        </pre>
      )}
    </Card>
  );
}
