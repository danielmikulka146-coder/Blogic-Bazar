"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { LiquidGlass } from "@/components/layout/LiquidGlass";
import { CompactFilterBar } from "@/components/ui/CompactFilterBar";

const noop = () => {};
const STUB_KAT = ["a"];
const STUB_STAV_ZB = ["x"];

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
};

function scheduleIdle(fn: () => void) {
  const w = window as IdleWindow;
  if (w.requestIdleCallback) {
    w.requestIdleCallback(fn, { timeout: 1000 });
  } else {
    setTimeout(fn, 100);
  }
}

/**
 * Mountuje LiquidGlass-bearing komponenty (CompactFilterBar variants, reset chip)
 * mimo viewport, aby si vygenerovaly mapy do cache s **přesnými** rozměry. Pak
 * první mount reálné instance (např. když user scrollne přes threshold a slot
 * se objeví) je cache hit + decoded → backdrop-filter aplikuje synchronně bez
 * "snap into existence".
 *
 * Stage gating: každý variant mountne v dalším idle slotu, aby se sériové
 * generování map (~10ms each + decode async) nesložilo do jednoho frame spike.
 * Po dokončení komponentu odmountuje — module-level mapCache zůstane.
 */
export function LiquidGlassPrewarm() {
  const [stage, setStage] = useState(0);
  const STAGES = 4;

  useEffect(() => {
    if (stage >= STAGES) return;
    let cancelled = false;
    scheduleIdle(() => {
      if (!cancelled) setStage((s) => s + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [stage]);

  // Žádný teardown — všechny varianty zůstávají v DOM offscreen po celou dobu
  // života aplikace. To drží browser image cache (decoded feImage data URLs)
  // permanentně warm → reálné instance LiquidGlass se objevují bez "snap" efektu
  // i když dorazí dlouho po prewarmu. Paměťová stopa je zanedbatelná.

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: -10000,
        left: -10000,
        pointerEvents: "none",
        opacity: 0,
        contain: "layout style paint",
      }}
    >
      {/* CompactFilterBar — nic není aktivní (3 buttons, žádné count badge, žádný reset) */}
      {stage >= 1 && (
        <CompactFilterBar
          kategorie={[]}
          setKategorie={noop}
          stavy={[]}
          setStavy={noop}
          stavyZbozi={[]}
          setStavyZbozi={noop}
          jenZdarma={false}
          setJenZdarma={noop}
          allKategorie={STUB_KAT}
          allStavy={STUB_STAV_ZB}
          allStavyZbozi={STUB_STAV_ZB}
          resetAll={noop}
        />
      )}
      {/* CompactFilterBar — zdarma aktivní (reset visible) */}
      {stage >= 2 && (
        <CompactFilterBar
          kategorie={[]}
          setKategorie={noop}
          stavy={[]}
          setStavy={noop}
          stavyZbozi={[]}
          setStavyZbozi={noop}
          jenZdarma={true}
          setJenZdarma={noop}
          allKategorie={STUB_KAT}
          allStavy={STUB_STAV_ZB}
          allStavyZbozi={STUB_STAV_ZB}
          resetAll={noop}
        />
      )}
      {/* CompactFilterBar — 1 kategorie active (1 count badge + reset) */}
      {stage >= 3 && (
        <CompactFilterBar
          kategorie={STUB_KAT}
          setKategorie={noop}
          stavy={[]}
          setStavy={noop}
          stavyZbozi={[]}
          setStavyZbozi={noop}
          jenZdarma={false}
          setJenZdarma={noop}
          allKategorie={STUB_KAT}
          allStavy={STUB_STAV_ZB}
          allStavyZbozi={STUB_STAV_ZB}
          resetAll={noop}
        />
      )}
      {/* CompactFilterBar — kategorie + stavZbozi active (2 count badges + reset) */}
      {stage >= 4 && (
        <CompactFilterBar
          kategorie={STUB_KAT}
          setKategorie={noop}
          stavy={[]}
          setStavy={noop}
          stavyZbozi={STUB_STAV_ZB}
          setStavyZbozi={noop}
          jenZdarma={false}
          setJenZdarma={noop}
          allKategorie={STUB_KAT}
          allStavy={STUB_STAV_ZB}
          allStavyZbozi={STUB_STAV_ZB}
          resetAll={noop}
        />
      )}
      {/* Reset chip z filter rowu v InzeratyListClient */}
      {stage >= 4 && (
        <LiquidGlass
          radius="pill"
          glassThickness={50}
          bezelWidth={16}
          refractiveIndex={1.5}
          scaleRatio={0.7}
          blur={1.0}
          specularSaturation={4}
          specularOpacity={0.5}
          tintColor="0, 0, 0"
          tintOpacity={0.08}
          innerShadowBlur={8}
          innerShadowSpread={-2}
          outerShadowBlur={16}
          fallbackBlur={14}
          style={{ padding: "8px 10px" }}
        >
          <X size={14} color="white" />
        </LiquidGlass>
      )}
      {/* HeaderRightSlot (cenová pilulka na detailu inzerátu) — pár typických šířek,
          aby se feImage decodovaly do browser image cache ještě před prvním použitím. */}
      {stage >= 4 && (
        <div style={{ display: "flex", gap: 8 }}>
          {[200, 240, 280].map((w) => (
            <LiquidGlass
              key={w}
              radius="pill"
              glassThickness={80}
              bezelWidth={60}
              refractiveIndex={1.5}
              scaleRatio={0.7}
              blur={1.0}
              specularSaturation={4}
              specularOpacity={0.75}
              tintColor="253, 126, 20"
              tintOpacity={0.1}
              innerShadowBlur={10}
              innerShadowSpread={-4}
              outerShadowBlur={28}
              fallbackBlur={18}
              style={{ width: w, height: 48 }}
            >
              <div style={{ width: w, height: 34 }} />
            </LiquidGlass>
          ))}
        </div>
      )}
    </div>
  );
}
