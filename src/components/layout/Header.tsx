"use client";

import { ActionIcon, Burger, Divider, Drawer, Group, ScrollArea, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Home } from "lucide-react";
import { LiquidGlass } from "@/components/layout/LiquidGlass";
import { SearchBar } from "@/components/layout/SearchBar";

const links = [
  { link: "/cs/inzeraty", label: "Inzeráty" },
  { link: "/cs/pridat", label: "Přidat inzerát" },
];

export function HeaderSearch() {
  const [opened, { toggle, close }] = useDisclosure(false);

  const items = links.map((link) => (
    <a
      key={link.label}
      href={link.link}
      style={{
        textDecoration: "none",
        color: "white",
        padding: "0 10px",
        fontSize: 14,
        fontWeight: 500,
        whiteSpace: "nowrap",
        opacity: 0.85,
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.85")}
    >
      {link.label}
    </a>
  ));

  return (
    <>
      {/* Floating header wrapper */}
      <div
        style={{
          position: "fixed",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          width: "calc(100% - 32px)",
          maxWidth: 900,
        }}
      >
        {/*
         * LiquidGlass — všechny parametry odpovídají ovladačům
         * v původním demu. Tady nastavené hodnoty jsou laděné
         * pro tenkou kapsuli (header), ne pro velký panel.
         *
         * Nejvíc na vzhled působí:
         *   glassThickness     — síla lomu (víc = výraznější)
         *   bezelWidth         — šířka "skleněné hrany"
         *   refractiveIndex    — index lomu 1.0–3.0
         *   scaleRatio         — celková intenzita posunu
         *   blur               — rozostření pozadí skrz sklo
         *   tintOpacity        — zabarvení kapsule
         */}
        <LiquidGlass
          radius="pill"
          glassThickness={42}
          bezelWidth={18}
          refractiveIndex={1.5}
          scaleRatio={1.0}
          blur={1.5}
          specularSaturation={4}
          specularOpacity={0.5}
          tintColor="123, 123, 123"
          tintOpacity={0.08}
          innerShadowBlur={14}
          innerShadowSpread={-4}
          outerShadowBlur={28}
          fallbackBlur={18}
          style={{ padding: "8px 20px" }}
        >
          <Group justify="space-between" align="center" wrap="nowrap">
            {/* Levá část — logo */}
            <Group gap="xs" style={{ flex: "0 0 auto" }}>
              <ActionIcon component="a" href="/" variant="subtle" color="gray" size="lg" radius="xl" aria-label="Domů">
                <Home size={20} />
              </ActionIcon>
              <Text fw={700} size="sm" visibleFrom="sm" c="white" style={{ whiteSpace: "nowrap" }}>
                Blogic Bazar
              </Text>
            </Group>

            {/* Střed — search bar */}
            <Group justify="center" style={{ flex: 1, minWidth: 0, margin: "0 12px" }} visibleFrom="sm">
              <SearchBar />
            </Group>

            {/* Pravá část — navigace + burger */}
            <Group gap={4} justify="flex-end" style={{ flex: "0 0 auto" }}>
              <Group gap={0} visibleFrom="sm">
                {items}
              </Group>
              <Burger opened={opened} onClick={toggle} size="sm" hiddenFrom="sm" aria-label="Otevřít menu" />
            </Group>
          </Group>
        </LiquidGlass>
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
          {items}
        </ScrollArea>
      </Drawer>
    </>
  );
}
