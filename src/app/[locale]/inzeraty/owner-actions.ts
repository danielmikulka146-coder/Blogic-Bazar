"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { inzeraty } from "@/db/schemas";
import { requireUser } from "@/lib/auth";
import { parsujFotky } from "@/lib/foto";

export type UpravitInzeratInput = {
  id: number;
  nazev: string;
  popis: string;
  kategorie: string;
  kontakt: string;
  telefon: string | null;
  stav: string;
  stavZbozi: string | null;
  cena: number;
  free: boolean;
  qrPlatba: boolean;
};

export async function upravitInzerat(input: UpravitInzeratInput) {
  const user = await requireUser();

  const existing = db
    .select()
    .from(inzeraty)
    .where(and(eq(inzeraty.id, input.id), eq(inzeraty.userId, user.id)))
    .get();
  if (!existing) {
    throw new Error("Inzerát nenalezen nebo k němu nemáš oprávnění");
  }

  await db
    .update(inzeraty)
    .set({
      nazev: input.nazev,
      popis: input.popis,
      kategorie: input.kategorie,
      kontakt: input.kontakt,
      telefon: input.telefon,
      stav: input.stav,
      stavZbozi: input.stavZbozi,
      cena: input.cena,
      free: input.free,
      qrPlatba: input.qrPlatba,
    })
    .where(eq(inzeraty.id, input.id));

  revalidatePath("/", "layout");
}

export async function odstranitInzerat(id: number) {
  const user = await requireUser();

  const existing = db
    .select()
    .from(inzeraty)
    .where(and(eq(inzeraty.id, id), eq(inzeraty.userId, user.id)))
    .get();
  if (!existing) {
    throw new Error("Inzerát nenalezen nebo k němu nemáš oprávnění");
  }

  // Odstraníme fotky z disku (ne-fatal).
  const fotky = parsujFotky(existing.foto);
  for (const webPath of fotky) {
    if (!webPath.startsWith("/")) continue;
    const segments = webPath.replace(/^\/+/, "").split("/").filter(Boolean);
    const abs = path.join(process.cwd(), "public", ...segments);
    await fs.unlink(abs).catch(() => {});
  }
  const dir = path.join(process.cwd(), "public", "inzeraty", String(id));
  await fs.rm(dir, { recursive: true, force: true }).catch(() => {});

  await db.delete(inzeraty).where(eq(inzeraty.id, id));

  revalidatePath("/", "layout");
}
