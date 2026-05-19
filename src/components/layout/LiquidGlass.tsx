"use client";

/**
 * LiquidGlass — React port of archisvaze/liquid-glass (SVG / index.html).
 *
 * Zachovává původní algoritmus 1:1:
 *   - calculateRefractionProfile: fyzikálně podložený profil lomu světla
 *   - generateDisplacementMap: canvas displacement mapa (R=posun X, G=posun Y)
 *   - generateSpecularMap: canvas mapa spekulárních odlesků na hraně
 *   - SVG #filter aplikovaný přes `backdrop-filter: url(#...)` na vrstvu ZA contentem
 *
 * Pozn.: Plný efekt funguje jen v Chrome / Chromium (stejně jako originál).
 * V Safari/Firefox `backdrop-filter: url()` není podporovaný — viz `fallbackBlur`.
 */

import { type CSSProperties, type ReactNode, useEffect, useId, useRef, useState } from "react";

/* ---------- Surface functions (z originálu) ---------- */

type SurfaceKey = "convex_squircle" | "convex_circle" | "concave" | "lip";

const SURFACE_FNS: Record<SurfaceKey, (x: number) => number> = {
  convex_squircle: (x) => (1 - (1 - x) ** 4) ** 0.25,
  convex_circle: (x) => Math.sqrt(1 - (1 - x) * (1 - x)),
  concave: (x) => 1 - Math.sqrt(1 - (1 - x) * (1 - x)),
  lip: (x) => {
    const convex = (1 - (1 - Math.min(x * 2, 1)) ** 4) ** 0.25;
    const concave = 1 - Math.sqrt(1 - (1 - x) * (1 - x)) + 0.1;
    const t = 6 * x ** 5 - 15 * x ** 4 + 10 * x ** 3;
    return convex * (1 - t) + concave * t;
  },
};

/* ---------- Refrakční profil (z originálu) ---------- */

function calculateRefractionProfile(
  glassThickness: number,
  bezelWidth: number,
  heightFn: (x: number) => number,
  ior: number,
  samples = 128,
): Float64Array {
  const eta = 1 / ior;
  function refract(nx: number, ny: number): [number, number] | null {
    const dot = ny;
    const k = 1 - eta * eta * (1 - dot * dot);
    if (k < 0) return null;
    const sq = Math.sqrt(k);
    return [-(eta * dot + sq) * nx, eta - (eta * dot + sq) * ny];
  }
  const profile = new Float64Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = i / samples;
    const y = heightFn(x);
    const dx = x < 1 ? 0.0001 : -0.0001;
    const y2 = heightFn(x + dx);
    const deriv = (y2 - y) / dx;
    const mag = Math.sqrt(deriv * deriv + 1);
    const ref = refract(-deriv / mag, -1 / mag);
    if (!ref) {
      profile[i] = 0;
      continue;
    }
    profile[i] = ref[0] * ((y * bezelWidth + glassThickness) / ref[1]);
  }
  return profile;
}

/* ---------- Displacement mapa (z originálu) ---------- */

function generateDisplacementMap(
  w: number,
  h: number,
  radius: number,
  bezelWidth: number,
  profile: Float64Array,
  maxDisp: number,
): string {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 128;
    d[i + 1] = 128;
    d[i + 2] = 0;
    d[i + 3] = 255;
  }

  const r = radius;
  const rSq = r * r;
  const r1Sq = (r + 1) ** 2;
  const rBSq = Math.max(r - bezelWidth, 0) ** 2;
  const wB = w - r * 2;
  const hB = h - r * 2;
  const S = profile.length;

  for (let y1 = 0; y1 < h; y1++) {
    for (let x1 = 0; x1 < w; x1++) {
      const x = x1 < r ? x1 - r : x1 >= w - r ? x1 - r - wB : 0;
      const y = y1 < r ? y1 - r : y1 >= h - r ? y1 - r - hB : 0;
      const dSq = x * x + y * y;
      if (dSq > r1Sq || dSq < rBSq) continue;
      const dist = Math.sqrt(dSq);
      const fromSide = r - dist;
      const op = dSq < rSq ? 1 : 1 - (dist - Math.sqrt(rSq)) / (Math.sqrt(r1Sq) - Math.sqrt(rSq));
      if (op <= 0 || dist === 0) continue;
      const cos = x / dist;
      const sin = y / dist;
      const bi = Math.min(((fromSide / bezelWidth) * S) | 0, S - 1);
      const disp = profile[bi] || 0;
      const dX = (-cos * disp) / maxDisp;
      const dY = (-sin * disp) / maxDisp;
      const idx = (y1 * w + x1) * 4;
      d[idx] = (128 + dX * 127 * op + 0.5) | 0;
      d[idx + 1] = (128 + dY * 127 * op + 0.5) | 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

/* ---------- Spekulární mapa (z originálu) ---------- */

function generateSpecularMap(w: number, h: number, radius: number, bezelWidth: number, angle = Math.PI / 3): string {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  d.fill(0);

  const r = radius;
  const rSq = r * r;
  const r1Sq = (r + 1) ** 2;
  const rBSq = Math.max(r - bezelWidth, 0) ** 2;
  const wB = w - r * 2;
  const hB = h - r * 2;
  const sv = [Math.cos(angle), Math.sin(angle)];

  for (let y1 = 0; y1 < h; y1++) {
    for (let x1 = 0; x1 < w; x1++) {
      const x = x1 < r ? x1 - r : x1 >= w - r ? x1 - r - wB : 0;
      const y = y1 < r ? y1 - r : y1 >= h - r ? y1 - r - hB : 0;
      const dSq = x * x + y * y;
      if (dSq > r1Sq || dSq < rBSq) continue;
      const dist = Math.sqrt(dSq);
      const fromSide = r - dist;
      const op = dSq < rSq ? 1 : 1 - (dist - Math.sqrt(rSq)) / (Math.sqrt(r1Sq) - Math.sqrt(rSq));
      if (op <= 0 || dist === 0) continue;
      const cos = x / dist;
      const sin = -y / dist;
      const dot = Math.abs(cos * sv[0] + sin * sv[1]);
      const edge = Math.sqrt(Math.max(0, 1 - (1 - fromSide) ** 2));
      const coeff = dot * edge;
      const col = (255 * coeff) | 0;
      const alpha = (col * coeff * op) | 0;
      const idx = (y1 * w + x1) * 4;
      d[idx] = col;
      d[idx + 1] = col;
      d[idx + 2] = col;
      d[idx + 3] = alpha;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

/* ---------- Props ---------- */

export interface LiquidGlassProps {
  children: ReactNode;
  /** border-radius v px. Default: "pill" = výška / 2. */
  radius?: number | "pill";
  /** Tloušťka skla (síla lomu). Originál default: 80. */
  glassThickness?: number;
  /** Šířka zkosené hrany, kde dochází k lomu. Originál default: 60. */
  bezelWidth?: number;
  /** Index lomu 1.0–3.0. Originál default: 3.0. */
  refractiveIndex?: number;
  /** Násobitel výsledného posunu. Originál default: 1.0. */
  scaleRatio?: number;
  /** Rozostření backdropu uvnitř filtru. Originál default: 0.3. */
  blur?: number;
  /** Sytost spekulárních odlesků (feColorMatrix saturate). Originál default: 4. */
  specularSaturation?: number;
  /** Opacita spekulárních odlesků 0–1. Originál default: 0.5. */
  specularOpacity?: number;
  /** Tvar povrchu. Originál default: convex_squircle. */
  surface?: SurfaceKey;
  /** Tint barva "r, g, b". Originál default: "255, 255, 255". */
  tintColor?: string;
  /** Tint opacita 0–1. Originál default: 0.06. */
  tintOpacity?: number;
  /** Barva vnitřního stínu. Originál default: "#ffffff". */
  innerShadowColor?: string;
  /** Blur vnitřního stínu v px. Originál default: 20. */
  innerShadowBlur?: number;
  /** Spread vnitřního stínu v px. Originál default: -5. */
  innerShadowSpread?: number;
  /** Blur vnějšího stínu v px. Originál default: 24. */
  outerShadowBlur?: number;
  /** Fallback blur (px) pro Safari/Firefox, kde url() filtr nefunguje. */
  fallbackBlur?: number;
  className?: string;
  style?: CSSProperties;
}

/* ---------- Komponenta ---------- */

export function LiquidGlass({
  children,
  radius = "pill",
  glassThickness = 80,
  bezelWidth = 60,
  refractiveIndex = 1.5,
  scaleRatio = 0.7,
  blur = 1.0,
  specularSaturation = 4,
  specularOpacity = 0.2,
  surface = "convex_squircle",
  tintColor = "123, 123, 123",
  tintOpacity = 0.08,
  innerShadowColor = "#ffffff",
  innerShadowBlur = 20,
  innerShadowSpread = -5,
  outerShadowBlur = 24,
  fallbackBlur = 16,
  className,
  style,
}: LiquidGlassProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const defsRef = useRef<SVGDefsElement>(null);
  const rawId = useId();
  const filterId = `lg-${rawId.replace(/:/g, "")}`;

  const [resolvedRadius, setResolvedRadius] = useState(999);

  useEffect(() => {
    const root = rootRef.current;
    const defs = defsRef.current;
    if (!root || !defs) return;

    let frame = 0;

    const rebuild = () => {
      const w = root.offsetWidth;
      const h = root.offsetHeight;
      if (w < 2 || h < 2) return;

      const cornerRadius = radius === "pill" ? Math.round(h / 2) : radius;
      setResolvedRadius(cornerRadius);

      // bezel nikdy nesmí přesáhnout rádius ani půlku menší strany
      const clampedBezel = Math.min(bezelWidth, cornerRadius - 1, Math.min(w, h) / 2 - 1);

      const heightFn = SURFACE_FNS[surface];
      const profile = calculateRefractionProfile(glassThickness, clampedBezel, heightFn, refractiveIndex, 128);
      const maxDisp = Math.max(...Array.from(profile).map(Math.abs)) || 1;
      const dispUrl = generateDisplacementMap(w, h, cornerRadius, clampedBezel, profile, maxDisp);
      const specUrl = generateSpecularMap(w, h, cornerRadius, clampedBezel * 2.5);
      const scale = maxDisp * scaleRatio;

      // přesně stejný filtr jako v originálu
      defs.innerHTML = `
        <filter id="${filterId}" x="0%" y="0%" width="100%" height="100%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" result="blurred_source" />
          <feImage href="${dispUrl}" x="0" y="0" width="${w}" height="${h}" result="disp_map" />
          <feDisplacementMap in="blurred_source" in2="disp_map"
            scale="${scale}" xChannelSelector="R" yChannelSelector="G"
            result="displaced" />
          <feColorMatrix in="displaced" type="saturate" values="${specularSaturation}" result="displaced_sat" />
          <feImage href="${specUrl}" x="0" y="0" width="${w}" height="${h}" result="spec_layer" />
          <feComposite in="displaced_sat" in2="spec_layer" operator="in" result="spec_masked" />
          <feComponentTransfer in="spec_layer" result="spec_faded">
            <feFuncA type="linear" slope="${specularOpacity}" />
          </feComponentTransfer>
          <feBlend in="spec_masked" in2="displaced" mode="normal" result="with_sat" />
          <feBlend in="spec_faded" in2="with_sat" mode="normal" />
        </filter>
      `;
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => requestAnimationFrame(rebuild));
    };

    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(root);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [
    radius,
    glassThickness,
    bezelWidth,
    refractiveIndex,
    scaleRatio,
    blur,
    specularSaturation,
    specularOpacity,
    surface,
    filterId,
  ]);

  const br = radius === "pill" ? resolvedRadius : radius;

  return (
    <div
      ref={rootRef}
      className={className}
      style={{
        position: "relative",
        borderRadius: br,
        isolation: "isolate",
        boxShadow: `0px 4px ${outerShadowBlur}px rgba(0, 0, 0, 0.18)`,
        ...style,
      }}
    >
      {/* Vrstva ZA contentem: backdrop-filter = liquid glass refrakce */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          zIndex: 0,
          // Chrome/Chromium: SVG filtr. Ostatní prohlížeče: prostý blur.
          backdropFilter: `url(#${filterId})`,
          WebkitBackdropFilter: `url(#${filterId})`,
          // Fallback (Safari/FF) — ignoruje neznámou url() a vezme blur
          background: "transparent",
        }}
      />
      {/* Fallback blur vrstva — viditelná jen tam, kde url() filtr selže */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          zIndex: 0,
          backdropFilter: `blur(${fallbackBlur}px)`,
          WebkitBackdropFilter: `blur(${fallbackBlur}px)`,
          // jen pro prohlížeče bez SVG-filter podpory; v Chrome překryto výše
          pointerEvents: "none",
          opacity: 0,
        }}
      />
      {/* Tint + vnitřní stín (z originálu ::before) */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          zIndex: 1,
          pointerEvents: "none",
          backgroundColor: `rgba(${tintColor}, ${tintOpacity})`,
          boxShadow: `inset 0 0 ${innerShadowBlur}px ${innerShadowSpread}px ${innerShadowColor}`,
        }}
      />
      {/* Content (ostrý, bez filtru) */}
      <div style={{ position: "relative", zIndex: 2 }}>{children}</div>

      {/* SVG defs s dynamicky generovaným filtrem */}
      <svg
        width="0"
        height="0"
        style={{ position: "absolute", overflow: "hidden" }}
        // sRGB barevný prostor – nutné pro správný displacement
        colorInterpolationFilters="sRGB"
        aria-hidden="true"
      >
        <defs ref={defsRef} />
      </svg>
    </div>
  );
}
