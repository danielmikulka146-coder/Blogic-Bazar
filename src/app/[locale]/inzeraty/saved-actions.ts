"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { savedInzeraty } from "@/db/schemas";
import { requireUser } from "@/lib/auth";

export async function toggleSavedInzerat(inzeratId: number): Promise<{ saved: boolean }> {
  const user = await requireUser();
  const existing = db
    .select()
    .from(savedInzeraty)
    .where(and(eq(savedInzeraty.userId, user.id), eq(savedInzeraty.inzeratId, inzeratId)))
    .get();

  if (existing) {
    await db
      .delete(savedInzeraty)
      .where(and(eq(savedInzeraty.userId, user.id), eq(savedInzeraty.inzeratId, inzeratId)));
    return { saved: false };
  }

  await db.insert(savedInzeraty).values({
    userId: user.id,
    inzeratId,
    createdAt: new Date(),
  });
  return { saved: true };
}
