"use client";

import { ActionIcon, Burger, Divider, Drawer, Group, ScrollArea, Text, useMantineColorScheme } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Home, Moon, Sun } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useFilterState } from "@/components/infrastructure/FilterStateProvider";
import { LiquidGlass } from "@/components/layout/LiquidGlass";
import { SearchBar } from "@/components/layout/SearchBar";
import { Link, usePathname } from "@/i18n/navigation";

const links = [
  { link: "/inzeraty", label: "Inzeráty" },
  { link: "/novy-inzerat", label: "Přidat inzerát" },
];

const HEADER_WIDTH_NORMAL = 720;
const HEADER_WIDTH_NARROW = 560;
const SPRING = { type: "spring", bounce: 0.28, duration: 0.55 } as const;

const SEARCH_ROUTES = ["/inzeraty"];

export function HeaderSearch() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const { headerSlot, headerSlotActive, headerSlotRight, headerSlotRightActive } = useFilterState();
  const showSlot = headerSlot !== null;
  const showSlotRight = headerSlotRight !== null;
  // showAnySlot řídí šířku/pozici hlavní pilulky. Posun mimo střed nastane jen
  // když je některý slot opticky aktivní. Když je slot mountnutý ale neaktivní,
  // hlavní pilulka zůstává centrovaná.
  const showAnySlot = (showSlot && headerSlotActive) || (showSlotRight && headerSlotRightActive);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const pathname = usePathname();
  const hideSearch = !SEARCH_ROUTES.includes(pathname);

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
      {/* Gradient blur backdrop */}
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
          background: colorScheme === "dark" ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 255, 255, 0.3)",
          maskImage: "linear-gradient(to bottom, black, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
        }}
      />

      {/* Pills row — full-width, flex center. LayoutGroup koordinuje position animace
          všech tří pilulí zároveň: hlavní pill se posune, vedlejší vyskočí/zmizí. */}
      <LayoutGroup id="header-pills">
        <div
          style={{
            position: "fixed",
            top: 16,
            left: 0,
            right: 0,
            zIndex: 1000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            padding: "0 16px",
            pointerEvents: "none",
          }}
        >
          {/* Levý slot (CompactFilterBar na /inzeraty) — mountnutý jen když je aktivní.
              Mount/unmount způsobí, že flex layout přepočítá pozici hlavní pilulky →
              layout="position" na main pillu animuje přechod mezi centrem a off-center. */}
          <AnimatePresence initial={false}>
            {showSlot && headerSlotActive && (
              <motion.div
                key="slot"
                layout="position"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.2, ease: "easeOut" } }}
                exit={{ opacity: 0, transition: { duration: 0.15, ease: "easeOut" } }}
                transition={SPRING}
                style={{ flex: "0 0 auto", pointerEvents: "auto" }}
              >
                {headerSlot}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hlavní header pill — šířka se mění skokově, pozice animuje přes transform.
              Žádný will-change ani translateZ(0): propagovaly by element na vlastní
              compositing layer → backdrop-filter uvnitř LiquidGlass by sampleloval
              prázdnou vrstvu místo pozadí stránky. */}
          <motion.div
            layout="position"
            transition={SPRING}
            style={{
              width: showAnySlot ? HEADER_WIDTH_NARROW : HEADER_WIDTH_NORMAL,
              maxWidth: "100%",
              flex: "0 1 auto",
              pointerEvents: "auto",
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
                {!hideSearch ? (
                  <Group justify="center" style={{ flex: 1, minWidth: 0, margin: "0 12px" }} visibleFrom="sm">
                    <SearchBar />
                  </Group>
                ) : (
                  <div style={{ flex: 1, minWidth: 0 }} />
                )}

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

          {/* Pravý slot (cena + rezervace na detail stránce) — mountnutý jen když je aktivní.
              Mount/unmount způsobí, že flex layout přepočítá pozici hlavní pilulky. */}
          <AnimatePresence initial={false}>
            {showSlotRight && headerSlotRightActive && (
              <motion.div
                key="slot-right"
                layout="position"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.2, ease: "easeOut" } }}
                exit={{ opacity: 0, transition: { duration: 0.15, ease: "easeOut" } }}
                transition={SPRING}
                style={{ flex: "0 0 auto", pointerEvents: "auto" }}
              >
                {headerSlotRight}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </LayoutGroup>

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
          {!hideSearch && (
            <>
              <SearchBar />
              <Divider my="sm" />
            </>
          )}
          {drawerItems}
        </ScrollArea>
      </Drawer>
    </>
  );
}
