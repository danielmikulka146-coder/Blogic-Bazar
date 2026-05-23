import { Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { inzeraty } from "@/db/schemas";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MojeInzeratyClient } from "./MojeInzeratyClient";

type Props = { params: Promise<{ locale: string }> };

export default async function Page({ params }: Props) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}`);

  const data = await db.select().from(inzeraty).where(eq(inzeraty.userId, user.id)).all();

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center" wrap="wrap">
        <Title order={2} c="var(--mantine-color-text)">
          Moje inzeráty
        </Title>
        <Text c="dimmed" size="sm">
          {data.length} {data.length === 1 ? "inzerát" : data.length >= 2 && data.length <= 4 ? "inzeráty" : "inzerátů"}
        </Text>
      </Group>

      {data.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          Zatím nemáš žádné inzeráty.{" "}
          <Link href="/novy-inzerat" style={{ color: "var(--mantine-color-orange-5)" }}>
            Přidat první
          </Link>
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          <MojeInzeratyClient data={data} />
        </SimpleGrid>
      )}
    </Stack>
  );
}
