// Toto je Server Component — běží pouze na serveru, může přímo přistupovat k databázi.
// Je async, protože čekáme na cleanupProdane() před vykreslením stránky.
import { ne } from "drizzle-orm"; // ne = "not equal" — pomocná funkce pro WHERE podmínky v Drizzle ORM
import { DriftingDots } from "@/components/DriftingDots";
import { db } from "@/db";
import { inzeraty } from "@/db/schemas";
import { cleanupProdane } from "./cleanup";
import { InzeratyListClient } from "./InzeratyListClient";

export default async function Page({ searchParams }: { searchParams: Promise<{ kategorie?: string }> }) {
  const { kategorie: initialKategorie } = await searchParams;

  // Před zobrazením dat smažeme staré prodané inzeráty — uživatel tak nikdy neuvidí "zastaralá" data.
  await cleanupProdane();

  // Přímý DB dotaz — ne přes API, protože jsme na serveru. Filtrujeme prodané rovnou v SQL, ne v JS.
  const data = db.select().from(inzeraty).where(ne(inzeraty.stav, "prodáno")).all();

  return (
    // position: relative kvůli DriftingDots, které jsou absolutně pozicované na pozadí.
    <div style={{ position: "relative" }}>
      <DriftingDots />
      {/* zIndex: 1 zajistí, že obsah je vždy nad animovanými tečkami na pozadí. */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Data předáváme jako prop — InzeratyListClient je Client Component a nemůže sahat do DB sama. */}
        <InzeratyListClient data={data} initialKategorie={initialKategorie} />
      </div>
    </div>
  );
}
