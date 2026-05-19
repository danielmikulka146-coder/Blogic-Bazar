import { SimpleGrid } from "@mantine/core";
import { db } from "@/db";
import { inzeraty } from "@/db/schemas";
import { InzeratCard } from "./InzeratCard";

export default async function Page() {
  const data = await db.select().from(inzeraty).all();

  return (
    <div>
      <SimpleGrid cols={3} spacing="md">
        {data.map((inzerat) => (
          <InzeratCard
            key={inzerat.id}
            nazev={inzerat.nazev}
            foto={inzerat.foto}
            kategorie={inzerat.kategorie}
            stav={inzerat.stav}
            cena={inzerat.cena}
            free={inzerat.free}
          />
        ))}
      </SimpleGrid>
    </div>
  );
}
