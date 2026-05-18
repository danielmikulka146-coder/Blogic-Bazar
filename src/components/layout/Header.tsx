"use client";

import { Autocomplete, Burger, Divider, Drawer, Group, ScrollArea, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Search } from "lucide-react";

const links = [
  { link: "/inzeraty", label: "Inzeráty" },
  { link: "/pridat", label: "Přidat inzerát" },
];

export function HeaderSearch() {
  const [opened, { toggle, close }] = useDisclosure(false);

  const items = links.map((link) => (
    <a key={link.label} href={link.link} style={{ textDecoration: "none", color: "inherit", padding: "0 8px" }}>
      {link.label}
    </a>
  ));

  return (
    <header style={{ borderBottom: "1px solid #eee" }}>
      <Group justify="space-between" p="md">
        <Group>
          <Burger opened={opened} onClick={toggle} size="sm" hiddenFrom="sm" aria-label="Otevřít menu" />
          <Text fw={700} size="lg">
            Blogic Bazar
          </Text>
        </Group>

        <Group>
          <Group gap={5} visibleFrom="sm">
            {items}
          </Group>
          <Autocomplete
            placeholder="Hledat"
            leftSection={<Search size={16} />}
            data={["Nábytek", "Elektronika", "Knihy", "Oblečení"]}
            visibleFrom="xs"
          />
        </Group>
      </Group>

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
          <Autocomplete
            placeholder="Hledat"
            leftSection={<Search size={16} />}
            data={["Nábytek", "Elektronika", "Knihy", "Oblečení"]}
            mx="md"
            mb="sm"
          />
          {items}
        </ScrollArea>
      </Drawer>
    </header>
  );
}
