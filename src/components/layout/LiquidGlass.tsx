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

import { useMantineColorScheme } from "@mantine/core";
import { type CSSProperties, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";

// useLayoutEffect na klientu, useEffect na serveru (potlačí SSR warning)
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

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

/* ---------- Cache ---------- */

// LiquidGlass instance často sdílí parametry (header pill, slot, filter chips)
// a stejné instance remountují (slot appear/disappear). Generování map stojí
// ~70k iterací kanvas matiky + toDataURL base64 + následně browser musí
// re-parsovat SVG filter a dekódovat data URL. Memoizace na úrovni modulu
// = první vygenerování zaplatí, další mounty pro stejné parametry už jen
// sahají do mapy a podávají hotovou URL → během mount-time animace žádný
// hlavní-thread spike.
type CachedMaps = { dispUrl: string; specUrl: string; maxDisp: number };
const mapCache = new Map<string, CachedMaps>();

/**
 * Pre-warmuje LiquidGlass mapy pro známé konfigurace mimo render cyklus.
 * Generování probíhá v idle callbacku (jeden config za slot), takže nikdy
 * neblokuje main thread déle než ~10ms. Po prewarmu mají všechny matching
 * LiquidGlass instance při mountu cache hit na map cache I na decoded set
 * → filtr se aplikuje synchronně bez "snap into existence".
 *
 * Volej z root klient komponenty (např. Providers) s configs odpovídajícími
 * komponentám, které nejsou ihned vidět (dropdown panely, filter chips,
 * compact filter bar v header slotu, ...).
 */
export type LiquidGlassPrewarmConfig = {
  width: number;
  height: number;
  radius?: number | "pill";
  glassThickness?: number;
  bezelWidth?: number;
  refractiveIndex?: number;
  surface?: SurfaceKey;
};

type IdleCallbackWindow = Window & {
  requestIdleCallback?: (cb: (deadline: { timeRemaining(): number }) => void, opts?: { timeout: number }) => number;
};

function scheduleIdle(fn: () => void): void {
  const w = window as IdleCallbackWindow;
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(fn, { timeout: 3000 });
  } else {
    setTimeout(fn, 0);
  }
}

export function prewarmLiquidGlass(configs: readonly LiquidGlassPrewarmConfig[]): void {
  if (typeof window === "undefined") return;

  for (const c of configs) {
    scheduleIdle(() => {
      const w = c.width;
      const h = c.height;
      const cornerRadius = c.radius === "pill" || c.radius === undefined ? Math.round(h / 2) : c.radius;
      const clampedBezel = Math.min(c.bezelWidth ?? 60, cornerRadius - 1, Math.min(w, h) / 2 - 1);
      getOrBuildMaps(
        w,
        h,
        cornerRadius,
        clampedBezel,
        c.glassThickness ?? 80,
        c.surface ?? "convex_squircle",
        c.refractiveIndex ?? 1.5,
      );
    });
  }
}

function getOrBuildMaps(
  w: number,
  h: number,
  cornerRadius: number,
  clampedBezel: number,
  glassThickness: number,
  surface: SurfaceKey,
  refractiveIndex: number,
): CachedMaps {
  const key = `${w}|${h}|${cornerRadius}|${clampedBezel}|${glassThickness}|${surface}|${refractiveIndex}`;
  const hit = mapCache.get(key);
  if (hit) return hit;

  const profile = calculateRefractionProfile(glassThickness, clampedBezel, SURFACE_FNS[surface], refractiveIndex, 128);
  let maxDisp = 0;
  for (let i = 0; i < profile.length; i++) {
    const v = Math.abs(profile[i]);
    if (v > maxDisp) maxDisp = v;
  }
  if (maxDisp === 0) maxDisp = 1;

  const dispUrl = generateDisplacementMap(w, h, cornerRadius, clampedBezel, profile, maxDisp);
  const specUrl = generateSpecularMap(w, h, cornerRadius, clampedBezel * 2.5);
  const entry: CachedMaps = { dispUrl, specUrl, maxDisp };
  mapCache.set(key, entry);
  return entry;
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
  /**
   * Multiplier RGB složek backdroupu po průchodu filtrem (0..1). Aplikuje se
   * jako poslední krok SVG filtru — uniformně ztmaví celý filtrovaný backdrop.
   * Default 0.85 dává "dark glass" efekt s plně čitelným bílým textem na
   * libovolném pozadí (eliminuje potřebu dynamic luminance sample/color swap).
   */
  brightness?: number;
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
  brightness = 0.7,
  className,
  style,
}: LiquidGlassProps) {
  const { colorScheme } = useMantineColorScheme();
  const isLight = colorScheme === "light";
  // Chromatický tint (oranžová, modrá, …) = explicitní barva, kterou chce uživatel vidět v obou módech.
  // Achromatický tint (bílá, černá, šedá) = výchozí "neutrální" sklo — v light módu přepneme na bílé.
  const tintRgb = tintColor.split(",").map((s) => Number.parseInt(s.trim(), 10));
  const isChromaticTint = tintRgb.length === 3 && Math.max(...tintRgb) - Math.min(...tintRgb) > 30;
  const overrideToWhite = isLight && !isChromaticTint;
  const effectiveTintColor = overrideToWhite ? "255, 255, 255" : tintColor;
  const effectiveTintOpacity = overrideToWhite
    ? tintOpacity * 7
    : isLight && isChromaticTint
      ? tintOpacity * 2.5
      : tintOpacity;
  const effectiveBrightness = overrideToWhite ? 1.15 : isLight && isChromaticTint ? 1.0 : brightness;

  const rootRef = useRef<HTMLDivElement>(null);
  const defsRef = useRef<SVGDefsElement>(null);
  const maxDispRef = useRef<number>(1);
  // Always holds the latest effectiveBrightness so stale ResizeObserver closures read current value
  const brightnessRef = useRef(effectiveBrightness);
  brightnessRef.current = effectiveBrightness;
  const rawId = useId();
  const filterId = `lg-${rawId.replace(/:/g, "")}`;

  const [resolvedRadius, setResolvedRadius] = useState(999);
  const [filterReady, setFilterReady] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    const defs = defsRef.current;
    if (!root || !defs) return;

    let frame = 0;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const buildFilterMarkup = (dispUrl: string, specUrl: string, filterScale: number, w: number, h: number) => {
      // brightness multiply matrix — dark mode darkens (< 1), light mode neutral (1.0)
      const b = brightnessRef.current;
      return `
        <filter id="${filterId}" x="0%" y="0%" width="100%" height="100%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" result="blurred_source" />
          <feImage href="${dispUrl}" x="0" y="0" width="${w}" height="${h}" result="disp_map" />
          <feDisplacementMap in="blurred_source" in2="disp_map"
            scale="${filterScale}" xChannelSelector="R" yChannelSelector="G"
            result="displaced" />
          <feColorMatrix in="displaced" type="saturate" values="${specularSaturation}" result="displaced_sat" />
          <feImage href="${specUrl}" x="0" y="0" width="${w}" height="${h}" result="spec_layer" />
          <feComposite in="displaced_sat" in2="spec_layer" operator="in" result="spec_masked" />
          <feComponentTransfer in="spec_layer" result="spec_faded">
            <feFuncA type="linear" slope="${specularOpacity}" />
          </feComponentTransfer>
          <feBlend in="spec_masked" in2="displaced" mode="normal" result="with_sat" />
          <feBlend in="spec_faded" in2="with_sat" mode="normal" result="composited" />
          <feColorMatrix in="composited" type="matrix"
            values="${b} 0 0 0 0  0 ${b} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0" />
        </filter>
      `;
    };

    const rebuild = () => {
      const w = root.offsetWidth;
      const h = root.offsetHeight;
      if (w < 2 || h < 2) return;

      const cornerRadius = radius === "pill" ? Math.round(h / 2) : radius;
      setResolvedRadius(cornerRadius);

      // bezel nikdy nesmí přesáhnout rádius ani půlku menší strany
      const clampedBezel = Math.min(bezelWidth, cornerRadius - 1, Math.min(w, h) / 2 - 1);

      // getOrBuildMaps je memoizované — cache hit = Map.get, cache miss = jediný
      // sync gen na první mount dané velikosti. Po LiquidGlassPrewarm a memoizaci
      // bývají naprostá většina mountů hit. Sync gen na miss je ~10ms blok, ale
      // padne na frame 0 mountu — animace už běží opacity-only, takže missnutý
      // jeden frame na startu je méně viditelný než nechybějící filtr po celou dobu.
      const { dispUrl, specUrl, maxDisp } = getOrBuildMaps(
        w,
        h,
        cornerRadius,
        clampedBezel,
        glassThickness,
        surface,
        refractiveIndex,
      );
      maxDispRef.current = maxDisp;
      defs.innerHTML = buildFilterMarkup(dispUrl, specUrl, maxDisp * scaleRatio, w, h);
      setFilterReady(true);
    };

    // Debounce: během Framer layout animací (např. změna šířky headeru když
    // se objeví/zmizí slot) by ResizeObserver firil na každém frameu a každý
    // rebuild generuje 2 canvas mapy + nastavuje innerHTML SVG filtru —
    // hlavní thread se zacpe a animace se sekají. Místo toho počkáme až
    // resize doznívá a přebuilduje se jen jednou na konci. Během animace
    // se stará displacement mapa lehce roztáhne, ale střed pillky je uniform
    // (128,128,0) a netriviální zóna je jen v rozích → opticky nepostřehnutelné.
    const schedule = () => {
      if (debounceTimer !== null) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(rebuild);
      }, 120);
    };

    // První rebuild synchronně — filtr musí být hotov před first paint, jinak je vidět "snap in"
    rebuild();
    const ro = new ResizeObserver(schedule);
    ro.observe(root);

    return () => {
      if (debounceTimer !== null) clearTimeout(debounceTimer);
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [radius, glassThickness, bezelWidth, refractiveIndex, surface, filterId]);

  // Light-props update — žádná regenerace canvas map, jen přepíše atributy v existujícím SVG filtru.
  // Deps: blur, scaleRatio, specularSaturation, specularOpacity. Heavy rebuild (výše) nastavuje
  // kompletní markup s aktuálními hodnotami → tento efekt poběží souběžně, ale idempotentně.
  useEffect(() => {
    const defs = defsRef.current;
    if (!defs) return;
    const filter = defs.querySelector(`#${filterId}`);
    if (!filter) return;
    (filter.querySelector("feGaussianBlur") as SVGFEGaussianBlurElement | null)?.setAttribute(
      "stdDeviation",
      String(blur),
    );
    (filter.querySelector("feDisplacementMap") as SVGFEDisplacementMapElement | null)?.setAttribute(
      "scale",
      String(maxDispRef.current * scaleRatio),
    );
    (filter.querySelector('feColorMatrix[type="saturate"]') as SVGFEColorMatrixElement | null)?.setAttribute(
      "values",
      String(specularSaturation),
    );
    (filter.querySelector("feFuncA") as SVGFEFuncAElement | null)?.setAttribute("slope", String(specularOpacity));
    const b = effectiveBrightness;
    (filter.querySelector('feColorMatrix[type="matrix"]') as SVGFEColorMatrixElement | null)?.setAttribute(
      "values",
      `${b} 0 0 0 0  0 ${b} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0`,
    );
  }, [filterId, blur, scaleRatio, specularSaturation, specularOpacity, effectiveBrightness]);

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
      {/* Backdrop — fallback blur dokud není SVG filtr v defs (před prvním paintem);
          po rebuild() přepne na url() glass. Jedna vrstva = žádný double-blur. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          zIndex: 0,
          backdropFilter: filterReady
            ? `url(#${filterId})`
            : `blur(${fallbackBlur}px) brightness(${effectiveBrightness})`,
          WebkitBackdropFilter: filterReady
            ? `url(#${filterId})`
            : `blur(${fallbackBlur}px) brightness(${effectiveBrightness})`,
          background: "transparent",
          willChange: "backdrop-filter",
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
          backgroundColor: `rgba(${effectiveTintColor}, ${effectiveTintOpacity})`,
          transition: "background-color 0.45s ease",
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
