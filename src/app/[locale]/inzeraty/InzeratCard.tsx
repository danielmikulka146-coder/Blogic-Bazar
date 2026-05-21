// src/app/[locale]/inzeraty/InzeratCard.tsx
"use client";

import { Badge, Card, Text, Title } from "@mantine/core";
import Image from "next/image";
import { useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { hlavniFotka } from "@/lib/foto";

type InzeratCardProps = {
  id: number;
  nazev: string;
  foto: string;
  kategorie: string;
  stav: string;
  cena: number | null;
  free: boolean;
};

const RESET_TILT = "perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0)";
const MAX_TILT = 8;

export function InzeratCard({ id, nazev, foto, kategorie, stav, cena, free }: InzeratCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [transform, setTransform] = useState(RESET_TILT);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotY = ((x - rect.width / 2) / (rect.width / 2)) * MAX_TILT;
    const rotX = -((y - rect.height / 2) / (rect.height / 2)) * MAX_TILT;
    setTransform(`perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(8px)`);
  };

  const handleMouseLeave = () => setTransform(RESET_TILT);

  return (
    <Card
      ref={cardRef}
      component={Link}
      href={`/inzeraty/${id}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      shadow="md"
      padding="md"
      radius="lg"
      style={{
        transform,
        transition: "transform 0.15s ease-out",
        transformStyle: "preserve-3d",
        willChange: "transform",
        textDecoration: "none",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          aspectRatio: "4/3",
          position: "relative",
          overflow: "hidden",
          borderRadius: 12,
          boxShadow: "0 10px 24px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.3)",
        }}
      >
        <Image src={hlavniFotka(foto)} alt={nazev} fill style={{ objectFit: "cover" }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
        <Badge color="blue" variant="light">
          {kategorie}
        </Badge>
        <Badge color={stav === "dostupné" ? "green" : stav === "prodáno" ? "red" : "orange"} variant="light">
          {stav}
        </Badge>
      </div>

      <Title order={3} c="var(--mantine-color-text)" mt={8}>
        {nazev}
      </Title>

      <Text c="var(--mantine-color-text)" fw={600} mt={4}>
        {free ? "Zdarma" : `${cena?.toLocaleString("cs-CZ")} Kč`}
      </Text>
    </Card>
  );
}
