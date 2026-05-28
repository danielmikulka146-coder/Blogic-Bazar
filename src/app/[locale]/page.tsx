import { desc, ne } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { inzeraty } from "@/db/schemas";
import { HomepageClient } from "./HomepageClient";

export async function generateMetadata() {
  const t = await getTranslations();

  return {
    title: t("page.home.title"),
    description: t("page.home.description"),
  };
}

export default async function Page(_: PageProps<"/[locale]">) {
  const nejnovejsi = db
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
    .from(inzeraty)
    .where(ne(inzeraty.stav, "prodáno"))
    .orderBy(desc(inzeraty.createdAt))
    .limit(20)
    .all();

  return <HomepageClient inzeraty={nejnovejsi} />;
}
