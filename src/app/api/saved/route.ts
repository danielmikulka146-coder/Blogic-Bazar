import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { savedInzeraty } from "@/db/schemas";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ids: [] });
  }
  const rows = await db
    .select({ inzeratId: savedInzeraty.inzeratId })
    .from(savedInzeraty)
    .where(eq(savedInzeraty.userId, user.id))
    .all();
  return NextResponse.json({ ids: rows.map((r) => r.inzeratId) });
}
