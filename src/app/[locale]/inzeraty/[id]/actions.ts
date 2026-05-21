"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { inzeraty } from "@/db/schemas";

export async function rezervujInzerat(id: number) {
  await db.update(inzeraty).set({ stav: "zarezervováno" }).where(eq(inzeraty.id, id));
  revalidatePath("/", "layout");
}
