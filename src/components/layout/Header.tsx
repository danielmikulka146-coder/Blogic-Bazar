"use client";

import { ActionIcon, Burger, Divider, Drawer, Group, ScrollArea, Text, useMantineColorScheme } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Home, Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef } from "react";
import { useFilterState } from "@/components/infrastructure/FilterStateProvider";
import { LiquidGlass } from "@/components/layout/LiquidGlass";
import { SearchBar } from "@/components/layout/SearchBar";
import { Link } from "@/i18n/navigation";

const links = [
  { link: "/inzeraty", label: "Inzeráty" },
  { link: "/novy-inzerat", label: "Přidat inzerát" },
];

const HEADER_WIDTH_NORMAL = 720;
const HEADER_WIDTH_NARROW = 560;
const SPRING = { type: "spring", bounce: 0.28, duration: 0.55 } as const;

export function HeaderSearch() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const { headerSlot, headerSlotRight } = useFilterState();
  const showSlot = headerSlot !== null;
  const showSlotRight = headerSlotRight !== null;
  const showAnySlot = showSlot || showSlotRight;
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  // Odkazy v headeru — text napevno bílý. Dark-glass backdrop (brightness 0.85
  // v LiquidGlass) zajistí čitelnost na libovolném pozadí bez dynamic luminance.
  const headerItems = links.map((link) => (
    <Link
      key={link.label}
      href={link.link}
      style={{
        textDecoration: "none",
        padding: "0 10px",
        fontSize: 14,
        fontWeight: 500,
        whiteSpace: "nowrap",
        color: "var(--mantine-color-text)",
        opacity: 0.85,
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.85")}
    >
      {link.label}
    </Link>
  ));

  // Odkazy v drawer mobilním menu — drawer má vlastní pozadí, takže text plain
  const drawerItems = links.map((link) => (
    <Link
      key={link.label}
      href={link.link}
      style={{
        textDecoration: "none",
        padding: "8px 10px",
        fontSize: 14,
        fontWeight: 500,
        whiteSpace: "nowrap",
        display: "block",
        color: "var(--mantine-color-text)",
      }}
    >
      {link.label}
    </Link>
  ));

  return (
    <>
      {/* Gradient blur — nahoře blurry, dole ostré, končí těsně pod pilulkou.
          Barva pozadí (0.2 opacity) se přirozeně vytrácí spolu s maskou. */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 80,
          zIndex: 999,
          pointerEvents: "none",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          background: colorScheme === "dark" ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.2)",
          maskImage: "linear-gradient(to bottom, black, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
        }}
      />

      {/* Floating wrapper — flex container, centrovaný jako celek přes CSS (transform recomputuje při změně šířky) */}
      <div
        style={{
          position: "fixed",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          display: "flex",
          gap: 8,
          alignItems: "center",
          maxWidth: "calc(100vw - 32px)",
        }}
      >
        {/* Header slot (např. CompactFilterBar) — vlevo od headeru, AnimatePresence pro enter/exit */}
        <AnimatePresence initial={false}>
          {showSlot && (
            <motion.div
              key="slot"
              layout="position"
              // Symetricky opacity-only pro entry i exit. Důvod: backdrop-filter
              // na slotu je drahý a každá změna scale/translate mění visible
              // bounds → browser re-blur backdroupu každý frame animace.
              // Když navíc uživatel zároveň scrolluje (typický spouštěč),
              // backdrop se mění i sám od sebe. Opacity-only animace udržují
              // konstantní bounds → GPU může cacheovat filtrovaný layer
              // a per-frame zbývá jen levná alfa kompozice. Spring na opacitě
              // dává jemný "settle" feel bez per-frame filter recomputu.
              //
              // Pozn.: žádný `will-change: opacity` ani `transform: translateZ(0)`
              // tady NEsmí být. Kterýkoli z nich propaguje wrapper na vlastní
              // compositing layer / stacking context → vnitřní LiquidGlass
              // `backdrop-filter: url()` pak sampleluje tuhle prázdnou vrstvu
              // místo pozadí stránky a refrakce zmizí (slot vypadá ploše).
              // Browser si layer během animace vytvoří lazy sám; vstup/výstup
              // se trigguje pouze přes scroll threshold, ne hot path.
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.18, ease: "easeOut" } }}
              transition={SPRING}
              style={{ flex: "0 0 auto" }}
            >
              {headerSlot}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header pill — šířka se mění skokově (layout="position"), pozice se animuje přes transform.
            Tím se backdrop-filter neaplikuje na resizující se element každý frame → výrazně levnější. */}
        <motion.div
          ref={headerRef}
          layout="position"
          transition={SPRING}
          style={{
            width: showAnySlot ? HEADER_WIDTH_NARROW : HEADER_WIDTH_NORMAL,
            maxWidth: "100%",
            flex: "0 1 auto",
          }}
        >
          <LiquidGlass
            radius="pill"
            glassThickness={80}
            bezelWidth={60}
            refractiveIndex={1.5}
            scaleRatio={0.7}
            blur={1.0}
            specularSaturation={4}
            specularOpacity={0.75}
            tintColor="0, 0, 0"
            tintOpacity={0.06}
            innerShadowBlur={10}
            innerShadowSpread={-4}
            outerShadowBlur={28}
            fallbackBlur={18}
            style={{ padding: "8px 20px" }}
          >
            <Group justify="space-between" align="center" wrap="nowrap">
              {/* Levá část — logo */}
              <Group gap="xs" style={{ flex: "0 0 auto" }}>
                <ActionIcon
                  component={Link}
                  href="/"
                  variant="subtle"
                  size="lg"
                  radius="xl"
                  aria-label="Domů"
                  style={{ color: "var(--mantine-color-text)" }}
                >
                  <Home size={20} />
                </ActionIcon>
                <Text
                  fw={700}
                  size="sm"
                  visibleFrom="sm"
                  style={{ whiteSpace: "nowrap", color: "var(--mantine-color-text)" }}
                >
                  Blogic Bazar
                </Text>
              </Group>

              {/* Střed — search bar */}
              <Group justify="center" style={{ flex: 1, minWidth: 0, margin: "0 12px" }} visibleFrom="sm">
                <SearchBar />
              </Group>

              {/* Pravá část — navigace + přepínač tématu + burger */}
              <Group gap={4} justify="flex-end" style={{ flex: "0 0 auto" }}>
                <Group gap={0} visibleFrom="sm">
                  {headerItems}
                </Group>
                <ActionIcon
                  variant="subtle"
                  size="lg"
                  radius="xl"
                  onClick={toggleColorScheme}
                  aria-label="Přepnout barevné schéma"
                  style={{ color: "var(--mantine-color-text)" }}
                >
                  {colorScheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                </ActionIcon>
                <Burger
                  opened={opened}
                  onClick={toggle}
                  size="sm"
                  hiddenFrom="sm"
                  aria-label="Otevřít menu"
                  color="var(--mantine-color-text)"
                />
              </Group>
            </Group>
          </LiquidGlass>
        </motion.div>

        {/* Header slot vpravo (např. cena + rezervace na detail stránce) */}
        <AnimatePresence initial={false}>
          {showSlotRight && (
            <motion.div
              key="slot-right"
              layout="position"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.18, ease: "easeOut" } }}
              transition={SPRING}
              style={{ flex: "0 0 auto" }}
            >
              {headerSlotRight}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobilní menu */}
      <Drawer
        opened={opened}
        onClose={close}
        size="100%"
        padding="md"
        title="Navigace"
        hiddenFrom="sm"
        zIndex={1000000}
      >
        <ScrollArea h="calc(100vh - 80px)" mx="-md">
          <Divider my="sm" />
          <SearchBar />
          <Divider my="sm" />
          {drawerItems}
        </ScrollArea>
      </Drawer>
    </>
  );
}
