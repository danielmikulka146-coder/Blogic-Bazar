import { Card, SimpleGrid, Title } from "@mantine/core";
import { db } from "@/db";
import { inzeraty } from "@/db/schemas";

export default async function Page() {
  const data = await db.select().from(inzeraty).all();

  return (
    <div>
      <SimpleGrid cols={3} spacing="md">
        {data.map((inzerat) => (
          <Card key={inzerat.id} shadow="md" padding="md" radius="lg" bg="#2A2A2A">
            <Title order={3} c="white">
              {inzerat.nazev}
            </Title>
            <p style={{ color: "white" }}>{inzerat.free ? "Zdarma" : `${inzerat.cena.toLocaleString("cs-CZ")} Kč`}</p>
          </Card>
        ))}
      </SimpleGrid>
    </div>
  );
}
