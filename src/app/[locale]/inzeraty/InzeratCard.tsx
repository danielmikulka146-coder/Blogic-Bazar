// src/app/[locale]/inzeraty/InzeratCard.tsx
"use client";

import { Badge, Card, Text, Title } from "@mantine/core";

type InzeratCardProps = {
  nazev: string;
  foto: string;
  kategorie: string;
  stav: string;
  cena: number | null;
  free: boolean;
};

export function InzeratCard({ nazev, foto, kategorie, stav, cena, free }: InzeratCardProps) {
  return (
    <Card shadow="md" padding="md" radius="lg" bg="#2A2A2A">
      <Card.Section>
        <img
          src={foto || "https://placehold.co/400x180?text=Bez+fotky"}
          alt={nazev}
          style={{ width: "100%", height: 180, objectFit: "cover" }}
        />
      </Card.Section>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <Badge color="blue" variant="light">
          {kategorie}
        </Badge>
        <Badge color={stav === "dostupné" ? "green" : "orange"} variant="light">
          {stav}
        </Badge>
      </div>

      <Title order={3} c="white" mt={8}>
        {nazev}
      </Title>

      <Text c="white" fw={600} mt={4}>
        {free ? "Zdarma" : `${cena?.toLocaleString("cs-CZ")} Kč`}
      </Text>
    </Card>
  );
}
