"use client";

import { Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFilterState } from "@/components/infrastructure/FilterStateProvider";
import { LiquidGlass } from "@/components/layout/LiquidGlass";
import { CompactFilterBar } from "@/components/ui/CompactFilterBar";
import { FilterChip } from "@/components/ui/FilterChip";
import { ReactiveCheckOption, ReactiveSeparator } from "@/components/ui/GlassDropdownPanel";
import { InzeratCard } from "./InzeratCard";

type Inzerat = {
  id: number;
  nazev: string;
  popis: string;
  kategorie: string;
  kontakt: string;
  stav: string;
  stavZbozi: string | null;
  foto: string;
  cena: number;
  free: boolean;
};

type Props = { data: Inzerat[] };

export function InzeratyListClient({ data }: Props) {
  const { searchQuery, setHeaderSlot } = useFilterState();
  const [kategorie, setKategorie] = useState<string[]>([]);
  const [stavy, setStavy] = useState<string[]>([]);
  const [stavyZbozi, setStavyZbozi] = useState<string[]>([]);
  const [jenZdarma, setJenZdarma] = useState(false);

  const filterRowRef = useRef<HTMLDivElement>(null);
  const [chipsInView, setChipsInView] = useState(true);

  const allKategorie = useMemo(() => Array.from(new Set(data.map((d) => d.kategorie))).sort(), [data]);
  // Stav: vždy nabízíme dostupné + zarezervováno (i kdyby zatím nebyly v datech),
  // plus jakékoli další stavy které v datech reálně existují.
  const allStavy = useMemo(() => {
    const fromData = new Set(data.map((d) => d.stav).filter(Boolean));
    fromData.add("dostupné");
    fromData.add("zarezervováno");
    const order = ["dostupné", "zarezervováno", "rezervováno", "prodáno"];
    return Array.from(fromData).sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b, "cs");
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [data]);
  // Stav zboží: vždy zobrazit všechny předdefinované volby (nezávisle na datech).
  const allStavyZbozi = useMemo(() => ["nové", "jako nové", "použité", "opotřebované", "poškozené"], []);

  const filtered = useMemo(() => {
    // "zarezervováno" a "rezervováno" jsou v datech promíchané — bereme je jako totéž.
    const reservedAliases = ["zarezervováno", "rezervováno"];
    const stavMatches = (filter: string, value: string) => {
      if (reservedAliases.includes(filter)) return reservedAliases.includes(value);
      return filter === value;
    };
    const q = searchQuery.trim().toLowerCase();
    return data.filter((i) => {
      if (q && !i.nazev.toLowerCase().includes(q)) return false;
      if (kategorie.length > 0 && !kategorie.includes(i.kategorie)) return false;
      if (stavy.length > 0 && !stavy.some((s) => stavMatches(s, i.stav))) return false;
      if (stavyZbozi.length > 0 && (!i.stavZbozi || !stavyZbozi.includes(i.stavZbozi))) return false;
      if (jenZdarma && !i.free) return false;
      return true;
    });
  }, [data, searchQuery, kategorie, stavy, stavyZbozi, jenZdarma]);

  const toggle = (set: string[], item: string, fn: (s: string[]) => void) => {
    if (set.includes(item)) fn(set.filter((x) => x !== item));
    else fn([...set, item]);
  };

  const resetAll = useCallback(() => {
    setKategorie([]);
    setStavy([]);
    setStavyZbozi([]);
    setJenZdarma(false);
  }, []);

  const activeChipCount = kategorie.length + stavy.length + stavyZbozi.length + (jenZdarma ? 1 : 0);
  const hasActiveFilters = activeChipCount > 0;

  // Detekce kdy filter row scrolluje ze zorného pole (přímý scroll listener — spolehlivější než IO)
  useEffect(() => {
    const HEADER_THRESHOLD = 80; // pod headerem
    const check = () => {
      const el = filterRowRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Když je bottom filter row nad threshold, jsou chips pryč ze zorného pole
      setChipsInView(rect.bottom > HEADER_THRESHOLD);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  // CompactFilterBar je v header slotu vždy (i když ho user nevidí). Visible prop
  // řídí pouze opacity — LiquidGlass instance zůstává mountnutá od mountu stránky,
  // takže když chips zmizí ze zorného pole, pilulka se objeví bez "snap into existence"
  // efektu. Animace header pillu (wide ↔ narrow) běží jen na page-level transition
  // (mount/unmount stránky), ne na scroll.
  useEffect(() => {
    setHeaderSlot(
      <CompactFilterBar
        kategorie={kategorie}
        setKategorie={setKategorie}
        stavy={stavy}
        setStavy={setStavy}
        stavyZbozi={stavyZbozi}
        setStavyZbozi={setStavyZbozi}
        jenZdarma={jenZdarma}
        setJenZdarma={setJenZdarma}
        allKategorie={allKategorie}
        allStavy={allStavy}
        allStavyZbozi={allStavyZbozi}
        resetAll={resetAll}
        visible={!chipsInView}
      />,
    );
  }, [
    chipsInView,
    kategorie,
    stavy,
    stavyZbozi,
    jenZdarma,
    allKategorie,
    allStavy,
    allStavyZbozi,
    resetAll,
    setHeaderSlot,
  ]);

  // Cleanup při unmountu (např. navigace pryč ze stránky)
  useEffect(() => () => setHeaderSlot(null), [setHeaderSlot]);

  return (
    <Stack gap="lg">
      {/* Filter bar */}
      <Stack gap="sm">
        <div ref={filterRowRef}>
          <Group gap="xs" wrap="wrap" align="flex-start">
            <FilterChip label="Kategorie" activeCount={kategorie.length}>
              <Stack gap={0}>
                {allKategorie.map((k, i) => (
                  <div key={k}>
                    {i > 0 && <ReactiveSeparator />}
                    <ReactiveCheckOption
                      value={k}
                      checked={kategorie.includes(k)}
                      onToggle={() => toggle(kategorie, k, setKategorie)}
                    />
                  </div>
                ))}
              </Stack>
            </FilterChip>

            <FilterChip label="Stav" activeCount={stavy.length}>
              <Stack gap={0}>
                {allStavy.map((s, i) => (
                  <div key={s}>
                    {i > 0 && <ReactiveSeparator />}
                    <ReactiveCheckOption
                      value={s}
                      checked={stavy.includes(s)}
                      onToggle={() => toggle(stavy, s, setStavy)}
                    />
                  </div>
                ))}
              </Stack>
            </FilterChip>

            <FilterChip label="Stav zboží" activeCount={stavyZbozi.length}>
              <Stack gap={0}>
                {allStavyZbozi.map((s, i) => (
                  <div key={s}>
                    {i > 0 && <ReactiveSeparator />}
                    <ReactiveCheckOption
                      value={s}
                      checked={stavyZbozi.includes(s)}
                      onToggle={() => toggle(stavyZbozi, s, setStavyZbozi)}
                    />
                  </div>
                ))}
              </Stack>
            </FilterChip>

            <FilterChip label="Zdarma" asToggle active={jenZdarma} onToggle={() => setJenZdarma((v) => !v)} />

            <AnimatePresence>
              {hasActiveFilters && (
                <motion.div
                  key="reset"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ type: "spring", bounce: 0.35, duration: 0.5 }}
                  style={{ display: "inline-block" }}
                >
                  <motion.button
                    type="button"
                    onClick={resetAll}
                    whileTap={{ scale: 0.93 }}
                    transition={{ type: "spring", stiffness: 500, damping: 28 }}
                    aria-label="Zrušit filtry"
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      padding: 0,
                      display: "block",
                    }}
                  >
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
                      <X size={14} color="var(--mantine-color-text)" />
                    </LiquidGlass>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </Group>
        </div>

        <Text size="sm" c="dimmed">
          {filtered.length} z {data.length} inzerátů
        </Text>
      </Stack>

      {/* Grid s motion stagger */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        <AnimatePresence mode="popLayout">
          {filtered.map((inzerat) => (
            <motion.div
              key={inzerat.id}
              layout
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
            >
              <InzeratCard
                id={inzerat.id}
                nazev={inzerat.nazev}
                foto={inzerat.foto}
                kategorie={inzerat.kategorie}
                stav={inzerat.stav}
                stavZbozi={inzerat.stavZbozi}
                cena={inzerat.cena}
                free={inzerat.free}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </SimpleGrid>

      {filtered.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          Žádné inzeráty neodpovídají filtrům.
        </Text>
      )}
    </Stack>
  );
}
