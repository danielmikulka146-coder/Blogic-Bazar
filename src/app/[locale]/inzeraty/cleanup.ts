import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { and, eq, isNotNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { inzeraty } from "@/db/schemas";
import { parsujFotky } from "@/lib/foto";

const TRI_DNY_SEC = 3 * 24 * 60 * 60;

/**
 * Smaže prodané inzeráty starší než 3 dny i s jejich fotkami z disku.
 * Voláme z fetch logiky přehledu inzerátů — lazy, žádný cron.
 */
export async function cleanupProdane(): Promise<void> {
  const cutoff = Math.floor(Date.now() / 1000) - TRI_DNY_SEC;
  const proSmazani = db
    .select()
    .from(inzeraty)
    .where(and(eq(inzeraty.stav, "prodáno"), isNotNull(inzeraty.soldAt), lt(inzeraty.soldAt, cutoff)))
    .all();

  if (proSmazani.length === 0) return;

  for (const inzerat of proSmazani) {
    const fotky = parsujFotky(inzerat.foto);
    for (const webPath of fotky) {
      if (!webPath.startsWith("/")) continue;
      const segments = webPath.replace(/^\/+/, "").split("/").filter(Boolean);
      const abs = path.join(process.cwd(), "public", ...segments);
      await fs.unlink(abs).catch(() => {});
    }
    const dir = path.join(process.cwd(), "public", "inzeraty", String(inzerat.id));
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});

    await db.delete(inzeraty).where(eq(inzeraty.id, inzerat.id));
  }
}
