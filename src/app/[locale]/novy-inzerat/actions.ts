"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { inzeraty } from "@/db/schemas";

export async function vytvorInzerat(formData: FormData) {
  const nazev = formData.get("nazev") as string;
  const popis = formData.get("popis") as string;
  const kategorie = formData.get("kategorie") as string;
  const kontakt = formData.get("kontakt") as string;
  const telefon = (formData.get("telefon") as string) || null;
  const stav = formData.get("stav") as string;
  const cena = Number(formData.get("cena"));
  const free = formData.get("free") === "true";
  const qrPlatba = formData.get("qrPlatba") === "true";
  const files = formData.getAll("foto") as File[];

  const [{ id }] = await db
    .insert(inzeraty)
    .values({ nazev, popis, kategorie, kontakt, telefon, stav, cena, free, qrPlatba, foto: "[]" })
    .returning({ id: inzeraty.id });

  const platneFiles = files.filter((f) => f.size > 0);

  if (platneFiles.length > 0) {
    const dir = path.join(process.cwd(), "public", "inzeraty", String(id));
    await fs.mkdir(dir, { recursive: true });

    const fotoPaths: string[] = [];
    for (const file of platneFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `${Date.now()}-${file.name}`;
      await fs.writeFile(path.join(dir, filename), buffer);
      fotoPaths.push(`/inzeraty/${id}/${filename}`);
    }

    await db
      .update(inzeraty)
      .set({ foto: JSON.stringify(fotoPaths) })
      .where(eq(inzeraty.id, id));
  }
}
