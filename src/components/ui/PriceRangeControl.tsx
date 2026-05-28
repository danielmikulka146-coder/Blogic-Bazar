"use client";

import { NumberInput, RangeSlider, Stack } from "@mantine/core";

const INK = "#1a1a1a";
const CARD = "#FBFAF6";
const ORANGE = "#FF5722";
const MONO_STACK = "var(--font-jb-mono), 'Courier New', ui-monospace, monospace";

type Props = {
  minCena: number | null;
  maxCena: number | null;
  setMinCena: (v: number | null) => void;
  setMaxCena: (v: number | null) => void;
  /** Horní limit dostupný v datech (max cena ze všech nesmazaných inzerátů). */
  maxAvailable: number;
};

const INPUT_STYLES = {
  input: {
    background: CARD,
    border: `2px dotted ${INK}`,
    borderRadius: 0,
    fontFamily: MONO_STACK,
    color: INK,
    fontSize: 12,
    height: 32,
    minHeight: 32,
    paddingInline: 8,
  },
} as const;

// Slider uvnitř pracuje s lineární pozicí [0, POSITION_MAX]; cena se mapuje
// mocninnou křivkou, aby u nízkých cen byl pohyb jemný a u vysokých hrubý.
const POSITION_MAX = 1000;
const CURVE = 3;

function positionToPrice(pos: number, max: number): number {
  const t = Math.max(0, Math.min(1, pos / POSITION_MAX));
  const raw = max * t ** CURVE;
  if (raw < 50) return Math.round(raw);
  if (raw < 500) return Math.round(raw / 10) * 10;
  if (raw < 5_000) return Math.round(raw / 50) * 50;
  if (raw < 50_000) return Math.round(raw / 100) * 100;
  return Math.round(raw / 500) * 500;
}

function priceToPosition(price: number, max: number): number {
  if (price <= 0 || max <= 0) return 0;
  if (price >= max) return POSITION_MAX;
  const t = (price / max) ** (1 / CURVE);
  return Math.round(t * POSITION_MAX);
}

/**
 * Min/max NumberInput + RangeSlider svázané. Slider mapuje pozici na cenu
 * mocninou (exponent 3) — stejná vzdálenost myší znamená u nízkých cen
 * menší změnu Kč, u vysokých větší.
 */
export function PriceRangeControl({ minCena, maxCena, setMinCena, setMaxCena, maxAvailable }: Props) {
  const sliderMax = Math.max(1, maxAvailable);
  const lo = Math.max(0, Math.min(sliderMax, minCena ?? 0));
  const hi = Math.max(lo, Math.min(sliderMax, maxCena ?? sliderMax));
  const posLo = priceToPosition(lo, sliderMax);
  const posHi = priceToPosition(hi, sliderMax);

  return (
    <Stack gap={10} style={{ minWidth: 240, padding: 6 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <NumberInput
          aria-label="Cena od"
          value={minCena ?? ""}
          onChange={(v) => {
            if (v === "" || v === undefined) return setMinCena(null);
            const n = Number(v);
            setMinCena(Number.isFinite(n) && n >= 0 ? n : null);
          }}
          placeholder="Od"
          suffix=" Kč"
          thousandSeparator=" "
          min={0}
          hideControls
          styles={INPUT_STYLES}
        />
        <span style={{ color: INK, fontFamily: MONO_STACK, opacity: 0.5 }}>—</span>
        <NumberInput
          aria-label="Cena do"
          value={maxCena ?? ""}
          onChange={(v) => {
            if (v === "" || v === undefined) return setMaxCena(null);
            const n = Number(v);
            setMaxCena(Number.isFinite(n) && n >= 0 ? n : null);
          }}
          placeholder="Do"
          suffix=" Kč"
          thousandSeparator=" "
          min={0}
          hideControls
          styles={INPUT_STYLES}
        />
      </div>
      <RangeSlider
        value={[posLo, posHi]}
        onChange={([a, b]) => {
          const priceA = positionToPrice(a, sliderMax);
          const priceB = positionToPrice(b, sliderMax);
          setMinCena(priceA > 0 ? priceA : null);
          setMaxCena(priceB < sliderMax ? priceB : null);
        }}
        min={0}
        max={POSITION_MAX}
        step={1}
        minRange={5}
        label={(v) => `${positionToPrice(v, sliderMax).toLocaleString("cs-CZ")} Kč`}
        size="sm"
        color="brand"
        thumbSize={14}
        styles={{
          track: { background: "rgba(26,26,26,0.12)" },
          bar: { background: ORANGE },
          thumb: {
            background: CARD,
            border: `2px solid ${INK}`,
            borderRadius: 0,
            width: 14,
            height: 14,
          },
          label: {
            background: INK,
            color: CARD,
            borderRadius: 0,
            fontFamily: MONO_STACK,
            fontSize: 10,
            letterSpacing: "0.04em",
          },
        }}
      />
    </Stack>
  );
}
