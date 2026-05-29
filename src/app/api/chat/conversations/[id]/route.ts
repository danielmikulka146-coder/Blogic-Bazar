import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { conversations } from "@/db/schemas";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// DELETE /api/chat/conversations/[id] — smazat konverzaci.
// Smazat může jen prodejce (vlastník inzerátu) — typicky když řeší nevyžádané/spam zprávy.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const { id } = await params;
  const convId = Number(id);
  if (!Number.isInteger(convId)) return NextResponse.json({ error: "Neplatné ID" }, { status: 400 });

  const conv = db.select().from(conversations).where(eq(conversations.id, convId)).get();
  if (!conv) return NextResponse.json({ error: "Konverzace nenalezena" }, { status: 404 });
  if (conv.sellerId !== user.id) {
    return NextResponse.json({ error: "Konverzaci může smazat jen vlastník inzerátu" }, { status: 403 });
  }

  // ON DELETE CASCADE v messages tabulce automaticky smaže všechny zprávy
  await db.delete(conversations).where(eq(conversations.id, convId));

  return NextResponse.json({ ok: true });
}
