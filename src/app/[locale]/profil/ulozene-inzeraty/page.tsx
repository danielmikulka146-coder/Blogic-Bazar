import { Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { inzeraty, savedInzeraty } from "@/db/schemas";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { InzeratCard } from "../../inzeraty/InzeratCard";

type Props = { params: Promise<{ locale: string }> };

export default async function Page({ params }: Props) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}`);

  const rows = await db
    .select({
      id: inzeraty.id,
      nazev: inzeraty.nazev,
      foto: inzeraty.foto,
      kategorie: inzeraty.kategorie,
      stav: inzeraty.stav,
      stavZbozi: inzeraty.stavZbozi,
      cena: inzeraty.cena,
      free: inzeraty.free,
    })
    .from(savedInzeraty)
    .innerJoin(inzeraty, eq(inzeraty.id, savedInzeraty.inzeratId))
    .where(eq(savedInzeraty.userId, user.id))
    .orderBy(desc(savedInzeraty.createdAt))
    .all();

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center" wrap="wrap">
        <Title order={2} c="var(--mantine-color-text)">
          Uložené inzeráty
        </Title>
        <Text c="dimmed" size="sm">
          {rows.length} {rows.length === 1 ? "inzerát" : rows.length >= 2 && rows.length <= 4 ? "inzeráty" : "inzerátů"}
        </Text>
      </Group>

      {rows.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          Zatím nemáš nic uloženého.{" "}
          <Link href="/inzeraty" style={{ color: "var(--mantine-color-orange-5)" }}>
            Projít inzeráty
          </Link>
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {rows.map((r) => (
            <InzeratCard
              key={r.id}
              id={r.id}
              nazev={r.nazev}
              foto={r.foto}
              kategorie={r.kategorie}
              stav={r.stav}
              stavZbozi={r.stavZbozi}
              cena={r.cena}
              free={r.free}
            />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}
