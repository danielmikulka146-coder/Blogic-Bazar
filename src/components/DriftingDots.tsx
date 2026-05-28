"use client";

import { useReducedMotion } from "@mantine/hooks";
import { useMemo } from "react";

type Dot = {
  top: string;
  left: string;
  size: number;
  color: string;
  opacity: number;
  animation: string;
  delay: string;
};

const KEYFRAME_NAMES = ["drift-1", "drift-2", "drift-3", "drift-4", "drift-5", "drift-6"];

function rng(seed: number) {
  // Mulberry32 — deterministický seedovaný PRNG. Stejné pozice mezi SSR a CSR.
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildDots(count = 70, seed = 7): Dot[] {
  const rand = rng(seed);
  const dots: Dot[] = [];
  // Prvních ~11 dotů oranžových, zbytek tmavé.
  const orangeCount = 11;
  for (let i = 0; i < count; i++) {
    const isOrange = i < orangeCount;
    const size = 1 + Math.floor(rand() * 3); // 1–3 px
    const opacity = isOrange ? 0.18 + rand() * 0.07 : 0.12 + rand() * 0.1; // 0.12–0.25
    const duration = 9 + rand() * 5; // 9–14 s
    const delay = -(rand() * duration); // záporný delay → různé fáze
    const animation = `${KEYFRAME_NAMES[i % KEYFRAME_NAMES.length]} ${duration.toFixed(2)}s ease-in-out infinite`;
    dots.push({
      top: `${(rand() * 100).toFixed(2)}%`,
      left: `${(rand() * 100).toFixed(2)}%`,
      size,
      color: isOrange ? "#FF5722" : "#1a1a1a",
      opacity,
      animation,
      delay: `${delay.toFixed(2)}s`,
    });
  }
  return dots;
}

export function DriftingDots({ count = 160 }: { count?: number }) {
  const reducedMotion = useReducedMotion();
  const dots = useMemo(() => buildDots(count), [count]);

  return (
    <div className="drifting-dots-layer" aria-hidden="true">
      {dots.map((d) => (
        <span
          key={`${d.top}-${d.left}-${d.color}-${d.delay}`}
          className="drifting-dot"
          style={{
            top: d.top,
            left: d.left,
            width: d.size,
            height: d.size,
            background: d.color,
            opacity: d.opacity,
            animation: reducedMotion ? "none" : d.animation,
            animationDelay: reducedMotion ? undefined : d.delay,
          }}
        />
      ))}
    </div>
  );
}
