"use client";

import { ActionIcon, Badge, Card, Group, Text, Title } from "@mantine/core";
import { Edit3, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useState, useTransition } from "react";
import { odstranitInzerat } from "@/app/[locale]/inzeraty/owner-actions";
import { Link } from "@/i18n/navigation";
import { hlavniFotka } from "@/lib/foto";

type Row = {
  id: number;
  nazev: string;
  foto: string;
  kategorie: string;
  stav: string;
  stavZbozi: string | null;
  cena: number;
  free: boolean;
};

export function MojeInzeratyClient({ data }: { data: Row[] }) {
  const [items, setItems] = useState(data);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [pendingId, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);

  const handleDelete = (id: number) => {
    setBusyId(id);
    startTransition(async () => {
      try {
        await odstranitInzerat(id);
        setItems((prev) => prev.filter((x) => x.id !== id));
      } finally {
        setBusyId(null);
        setConfirmId(null);
      }
    });
  };

  return (
    <AnimatePresence mode="popLayout">
      {items.map((item) => {
        const isConfirming = confirmId === item.id;
        const isDeleting = busyId === item.id && pendingId;
        return (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <Card shadow="md" padding="md" radius="lg" style={{ position: "relative" }}>
              <Link href={`/inzeraty/${item.id}`} style={{ textDecoration: "none", display: "block" }}>
                <div
                  style={{
                    aspectRatio: "4/3",
                    position: "relative",
                    overflow: "hidden",
                    borderRadius: 12,
                    boxShadow: "0 10px 24px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3)",
                  }}
                >
                  <Image src={hlavniFotka(item.foto)} alt={item.nazev} fill style={{ objectFit: "cover" }} />
                </div>
                <Group justify="space-between" align="center" mt={12} gap={6}>
                  <Badge color="blue" variant="light">
                    {item.kategorie}
                  </Badge>
                  <Badge
                    color={item.stav === "dostupné" ? "green" : item.stav === "prodáno" ? "red" : "orange"}
                    variant="light"
                  >
                    {item.stav}
                  </Badge>
                </Group>
                <Title order={4} c="var(--mantine-color-text)" mt={6}>
                  {item.nazev}
                </Title>
                <Text c="var(--mantine-color-text)" fw={600} mt={2}>
                  {item.free ? "Zdarma" : `${item.cena.toLocaleString("cs-CZ")} Kč`}
                </Text>
              </Link>

              <Group justify="flex-end" gap={6} mt={12}>
                {!isConfirming ? (
                  <>
                    <ActionIcon
                      component={Link}
                      href={`/inzeraty/${item.id}/upravit`}
                      variant="light"
                      color="blue"
                      aria-label="Upravit"
                    >
                      <Edit3 size={16} />
                    </ActionIcon>
                    <ActionIcon variant="light" color="red" aria-label="Smazat" onClick={() => setConfirmId(item.id)}>
                      <Trash2 size={16} />
                    </ActionIcon>
                  </>
                ) : (
                  <>
                    <Text size="xs" c="dimmed">
                      Opravdu smazat?
                    </Text>
                    <ActionIcon
                      variant="default"
                      aria-label="Zrušit"
                      onClick={() => setConfirmId(null)}
                      disabled={!!isDeleting}
                    >
                      <span style={{ fontSize: 16 }}>×</span>
                    </ActionIcon>
                    <ActionIcon
                      variant="filled"
                      color="red"
                      aria-label="Potvrdit smazání"
                      onClick={() => handleDelete(item.id)}
                      loading={!!isDeleting}
                    >
                      <Trash2 size={16} />
                    </ActionIcon>
                  </>
                )}
              </Group>
            </Card>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
