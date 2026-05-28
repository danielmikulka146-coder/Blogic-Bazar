// Dynamická route — [id] v názvu složky = Next.js předá id jako prop v params.
// Tato stránka je Server Component: načte všechna potřebná data a předá je klientu.
import { count, eq } from "drizzle-orm";
import { notFound } from "next/navigation"; // notFound() = vrátí 404 stránku, zastaví vykonávání
import { db } from "@/db";
import { inzeraty, savedInzeraty, users } from "@/db/schemas";
import { getCurrentUser } from "@/lib/auth";
import { parsujFotky } from "@/lib/foto";
import { InzeratDetailClient } from "./InzeratDetailClient";

type Props = {
  params: Promise<{ id: string }>; // params je Promise — Next.js 15 async API
};

export default async function Page({ params }: Props) {
  const { id } = await params;
  const numericId = Number(id);
  // Validace vstupu — uživatel může zadat cokoliv do URL (např. "/inzeraty/abc").
  if (!Number.isInteger(numericId)) notFound();

  const inzerat = db.select().from(inzeraty).where(eq(inzeraty.id, numericId)).get();
  // .get() vrátí jeden záznam nebo undefined — pokud neexistuje, zobrazíme 404.
  if (!inzerat) notFound();

  // parsujFotky = vezme JSON string uložený v DB a vrátí pole URL jako string[].
  const fotky = parsujFotky(inzerat.foto);
  // Owner může být null — starší inzeráty nemusí mít přiřazeného uživatele.
  const owner = inzerat.userId ? (db.select().from(users).where(eq(users.id, inzerat.userId)).get() ?? null) : null;
  // getCurrentUser je async — čte session cookie a ověřuje JWT token.
  const currentUser = await getCurrentUser();
  // isOwner = přihlášený uživatel je zároveň autor inzerátu → zobrazí se jiné UI (edit/delete tlačítka).
  const isOwner = currentUser != null && inzerat.userId === currentUser.id;

  // Počet uživatelů, kteří si inzerát uložili — zobrazuje se ownerovi jako statistika.
  const savedCountRow = db
    .select({ c: count() })
    .from(savedInzeraty)
    .where(eq(savedInzeraty.inzeratId, numericId))
    .get();
  const savedCount = savedCountRow?.c ?? 0; // ?. ?? 0 = bezpečný přístup, pokud row neexistuje

  const isReservedByMe = currentUser != null && inzerat.reservedBy === currentUser.id;
  const isBuyer = currentUser != null && inzerat.buyerId === currentUser.id;

  // Předáváme jen pole, která klient potřebuje — ne celý DB objekt (bezpečnost + čistota API).
  return (
    <InzeratDetailClient
      inzerat={{
        id: inzerat.id,
        nazev: inzerat.nazev,
        popis: inzerat.popis,
        kategorie: inzerat.kategorie,
        kontakt: inzerat.kontakt,
        stav: inzerat.stav,
        cena: inzerat.cena,
        free: inzerat.free,
        telefon: inzerat.telefon,
        stavZbozi: inzerat.stavZbozi,
        viewsCount: inzerat.viewsCount,
        ownerLastSeenViews: inzerat.ownerLastSeenViews,
        paymentDone: inzerat.paymentDone,
        createdAt: inzerat.createdAt,
      }}
      fotky={fotky}
      owner={owner ? { name: owner.name, picture: owner.picture, email: owner.email } : null}
      isOwner={isOwner}
      isReservedByMe={isReservedByMe}
      isBuyer={isBuyer}
      isLoggedIn={currentUser != null}
      savedCount={savedCount}
    />
  );
}
