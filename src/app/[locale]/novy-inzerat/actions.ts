"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { inzeraty } from "@/db/schemas";
import { requireUser } from "@/lib/auth";
import { imageToWebp, toWebpFilename } from "@/lib/serverImageProcess";
import { dropSessionDir } from "@/lib/uploadSession";

export async function vytvorInzerat(formData: FormData) {
  const user = await requireUser();

  const nazev = formData.get("nazev") as string;
  const popis = formData.get("popis") as string;
  const kategorie = formData.get("kategorie") as string;
  const kontakt = formData.get("kontakt") as string;
  const telefon = (formData.get("telefon") as string) || null;
  const stavZbozi = (formData.get("stavZbozi") as string) || null;
  const stav = formData.get("stav") as string;
  const cena = Number(formData.get("cena"));
  const free = formData.get("free") === "true";
  const qrPlatba = formData.get("qrPlatba") === "true";
  const files = formData.getAll("foto") as File[];
  const remoteFotoPaths = formData.getAll("remoteFoto") as string[];
  const uploadSessionKey = formData.get("uploadSessionKey") as string | null;

  const [{ id }] = await db
    .insert(inzeraty)
    .values({
      nazev,
      popis,
      kategorie,
      kontakt,
      telefon,
      stav,
      stavZbozi,
      cena,
      free,
      qrPlatba,
      foto: "[]",
      userId: user.id,
    })
    .returning({ id: inzeraty.id });

  const platneFiles = files.filter((f) => f.size > 0);
  const platneRemote = remoteFotoPaths.filter((p) => typeof p === "string" && p.startsWith("/uploads/tmp/"));

  if (platneFiles.length > 0 || platneRemote.length > 0) {
    const dir = path.join(process.cwd(), "public", "inzeraty", String(id));
    await fs.mkdir(dir, { recursive: true });
    const fotoPaths: string[] = [];

    for (const file of platneFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const webp = await imageToWebp(buffer);
      const filename = toWebpFilename(`${Date.now()}-${file.name}`);
      await fs.writeFile(path.join(dir, filename), webp);
      fotoPaths.push(`/inzeraty/${id}/${filename}`);
    }

    for (const webPath of platneRemote) {
      const safe = webPath.replace(/^\/+/, "").split("/").filter(Boolean);
      const src = path.join(process.cwd(), "public", ...safe);
      const filename = toWebpFilename(safe[safe.length - 1]);
      const dest = path.join(dir, filename);
      try {
        const webp = await imageToWebp(src);
        await fs.writeFile(dest, webp);
        await fs.unlink(src).catch(() => {});
      } catch {
        continue;
      }
      fotoPaths.push(`/inzeraty/${id}/${filename}`);
    }

    await db
      .update(inzeraty)
      .set({ foto: JSON.stringify(fotoPaths) })
      .where(eq(inzeraty.id, id));
  }

  if (uploadSessionKey) {
    await dropSessionDir(uploadSessionKey);
  }
}
