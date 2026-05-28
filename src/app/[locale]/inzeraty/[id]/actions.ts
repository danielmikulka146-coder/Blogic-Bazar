// Server actions pro detail inzerátu — rezervace, prodej, platba, zobrazení.
// Každá funkce ověří přihlášení a oprávnění, pak provede DB operaci.
"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { inzeraty } from "@/db/schemas";
import { getCurrentUser, requireUser } from "@/lib/auth";

// Diskriminovaný union pro návratové hodnoty — client kód ví přesně co může přijít.
// { ok: true } nebo { ok: false; error: string } — žádné undefined, žádné try/catch na klientu.
type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Toggle rezervace. Pokud je inzerát volný → zarezervuje pro aktuálního usera.
 * Pokud už je rezervovaný TÍMTO userem → zruší. Pokud cizím → odmítne.
 */
export async function toggleRezervace(id: number): Promise<ActionResult> {
  const user = await requireUser();
  const inzerat = db.select().from(inzeraty).where(eq(inzeraty.id, id)).get();
  if (!inzerat) return { ok: false, error: "Inzerát nenalezen" };
  if (inzerat.stav === "prodáno") return { ok: false, error: "Inzerát už je prodaný" };

  // Vlastník inzerátu nemá rezervaci řešit (má toggle prodáno).
  if (inzerat.userId === user.id) return { ok: false, error: "Vlastník inzerátu nemůže rezervovat" };

  if (inzerat.stav === "dostupné") {
    await db.update(inzeraty).set({ stav: "zarezervováno", reservedBy: user.id }).where(eq(inzeraty.id, id));
    revalidatePath("/", "layout");
    return { ok: true };
  }

  // Stav je zarezervováno/rezervováno — povolíme jen zrušení vlastní rezervace.
  if (inzerat.reservedBy !== user.id) {
    return { ok: false, error: "Inzerát si zarezervoval někdo jiný" };
  }
  await db.update(inzeraty).set({ stav: "dostupné", reservedBy: null }).where(eq(inzeraty.id, id));
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Vlastníkův toggle "prodáno". Slouží i pro test — kliknutí znovu vrátí na "dostupné".
 */
export async function toggleProdano(id: number): Promise<ActionResult> {
  const user = await requireUser();
  const inzerat = db.select().from(inzeraty).where(eq(inzeraty.id, id)).get();
  if (!inzerat) return { ok: false, error: "Inzerát nenalezen" };
  if (inzerat.userId !== user.id) return { ok: false, error: "Pouze vlastník může označit jako prodáno" };

  if (inzerat.stav === "prodáno") {
    await db
      .update(inzeraty)
      .set({ stav: "dostupné", soldAt: null, buyerId: null, paymentDone: false })
      .where(eq(inzeraty.id, id));
  } else {
    await db
      .update(inzeraty)
      .set({ stav: "prodáno", soldAt: Math.floor(Date.now() / 1000) })
      .where(eq(inzeraty.id, id));
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Kliknutí "Zaplaceno" nebo "Zaplatím jinak" v QR modalu.
 * Pro kupujícího: označí inzerát jako koupený jím (buyerId, paymentDone).
 * Pro vlastníka (jeho vlastní QR view): jen označí paymentDone (kdyby chtěl test).
 * Stav inzerátu zůstává — prodáno se nastaví zvlášť přes toggleProdano.
 */
export async function oznacitZaplaceno(id: number): Promise<ActionResult> {
  const user = await requireUser();
  const inzerat = db.select().from(inzeraty).where(eq(inzeraty.id, id)).get();
  if (!inzerat) return { ok: false, error: "Inzerát nenalezen" };

  if (inzerat.userId === user.id) {
    // Vlastník — jen flagne paymentDone (pro testovací účely).
    await db.update(inzeraty).set({ paymentDone: true }).where(eq(inzeraty.id, id));
  } else {
    // Kupující — zapíše se jako buyer a stav se posune na prodáno.
    await db
      .update(inzeraty)
      .set({
        buyerId: user.id,
        paymentDone: true,
        stav: "prodáno",
        soldAt: Math.floor(Date.now() / 1000),
      })
      .where(eq(inzeraty.id, id));
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Inkrement views. Vlastníkovi views nezvyšuje (jeho návštěvy se nepočítají),
 * ale jeho ownerLastSeenViews se posune na aktuální viewsCount aby se delta resetla
 * AŽ při PŘÍŠTÍ návštěvě. Server action voláme z client unmount efektu.
 */
export async function ukoncitProhlizeni(id: number): Promise<void> {
  const user = await getCurrentUser();
  const inzerat = db
    .select({ id: inzeraty.id, userId: inzeraty.userId, viewsCount: inzeraty.viewsCount })
    .from(inzeraty)
    .where(eq(inzeraty.id, id))
    .get();
  if (!inzerat) return;

  if (user && inzerat.userId === user.id) {
    // Majitel opustil detail — reset delty.
    await db.update(inzeraty).set({ ownerLastSeenViews: inzerat.viewsCount }).where(eq(inzeraty.id, id));
  }
}

/**
 * Inkrement views při načtení detailu (mimo vlastníka).
 */
export async function pridatZobrazeni(id: number): Promise<void> {
  const user = await getCurrentUser();
  const inzerat = db.select({ userId: inzeraty.userId }).from(inzeraty).where(eq(inzeraty.id, id)).get();
  if (!inzerat) return;
  if (user && inzerat.userId === user.id) return; // vlastní views nepočítáme

  // sql`...` = raw SQL výraz — Drizzle ho vloží do dotazu tak jak je.
  // Díky tomu inkrementujeme přímo v DB (atomická operace) místo: načíst → +1 → zapsat.
  // Bez toho by dva souběžní návštěvníci mohli oba přečíst stejnou hodnotu a přepsat se navzájem.
  await db
    .update(inzeraty)
    .set({ viewsCount: sql`${inzeraty.viewsCount} + 1` })
    .where(eq(inzeraty.id, id));
}
