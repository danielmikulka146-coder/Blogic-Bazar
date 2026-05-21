"use client";

import { DepthSelect, type DepthSelectItem } from "@gfazioli/mantine-depth-select";
import NextImage from "next/image";
import { useEffect, useState } from "react";

const SHADOW = "0 10px 24px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.3)";
const FALLBACK_BG = "var(--mantine-color-dark-8)";

type Props = {
  fotky: string[];
  nazev: string;
};

// Vyzobne průměrnou barvu okrajů obrázku (perimetr 16×16 downsamplu) a vrátí
// ji jako rgb(). Tím se "letterbox" prostor u objectFit:contain napojí na obraz
// místo aby s ním tvrdě kontrastoval — bez nutnosti rozmazaného duplikátu.
function useEdgeColor(src: string): string {
  const [color, setColor] = useState(FALLBACK_BG);

  useEffect(() => {
    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      try {
        const SAMPLE = 16;
        const canvas = document.createElement("canvas");
        canvas.width = SAMPLE;
        canvas.height = SAMPLE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
        const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE);

        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let y = 0; y < SAMPLE; y++) {
          for (let x = 0; x < SAMPLE; x++) {
            // Pouze pixely na perimetru — vnitřek přeskočíme
            if (x > 0 && x < SAMPLE - 1 && y > 0 && y < SAMPLE - 1) continue;
            const i = (y * SAMPLE + x) * 4;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
        }
        setColor(`rgb(${(r / count) | 0}, ${(g / count) | 0}, ${(b / count) | 0})`);
      } catch {
        // CORS-tainted canvas → fallback zůstane
      }
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return color;
}

function CardView({ src, alt }: { src: string; alt: string }) {
  const bg = useEdgeColor(src);
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: SHADOW,
        background: bg,
        transition: "background 0.4s ease",
      }}
    >
      <NextImage src={src} alt={alt} fill style={{ objectFit: "contain" }} />
    </div>
  );
}

export function FotoGalerie({ fotky, nazev }: Props) {
  if (fotky.length === 0) {
    return (
      <div
        style={{
          aspectRatio: "4/3",
          position: "relative",
          overflow: "hidden",
          borderRadius: 16,
          background: "var(--mantine-color-dark-6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--mantine-color-dimmed)",
          fontSize: 14,
          boxShadow: SHADOW,
        }}
      >
        Bez fotky
      </div>
    );
  }

  if (fotky.length === 1) {
    return (
      <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: SHADOW }}>
        <NextImage
          src={fotky[0]}
          alt={nazev}
          width={0}
          height={0}
          sizes="100vw"
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </div>
    );
  }

  const items: DepthSelectItem[] = fotky.map((src, i) => ({
    value: src,
    view: <CardView src={src} alt={`${nazev} – fotka ${i + 1}`} />,
  }));

  return <DepthSelect data={items} w="100%" h={320} loop blurStep={3} visibleCards={5} />;
}
