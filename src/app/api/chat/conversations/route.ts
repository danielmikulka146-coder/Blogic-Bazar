import { and, desc, eq, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { conversations, inzeraty, messages, users } from "@/db/schemas";
import { getCurrentUser } from "@/lib/auth";

// POST /api/chat/conversations — vytvoří konverzaci nebo vrátí existující
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const body = (await req.json()) as { inzeratId?: number };
  if (!body.inzeratId) return NextResponse.json({ error: "Chybí inzeratId" }, { status: 400 });

  const inzerat = db.select().from(inzeraty).where(eq(inzeraty.id, body.inzeratId)).get();
  if (!inzerat) return NextResponse.json({ error: "Inzerát nenalezen" }, { status: 404 });
  if (!inzerat.userId) return NextResponse.json({ error: "Inzerát nemá majitele" }, { status: 400 });
  if (inzerat.userId === user.id) return NextResponse.json({ error: "Nemůžeš psát sám sobě" }, { status: 400 });

  // Najdi existující konverzaci mezi tímto kupcem a prodejcem pro tento inzerát
  const existing = db
    .select()
    .from(conversations)
    .where(and(eq(conversations.inzeratId, body.inzeratId), eq(conversations.buyerId, user.id)))
    .get();

  if (existing) return NextResponse.json({ id: existing.id });

  const now = Math.floor(Date.now() / 1000);
  const [created] = await db
    .insert(conversations)
    .values({
      inzeratId: body.inzeratId,
      buyerId: user.id,
      sellerId: inzerat.userId,
      createdAt: now,
      lastMessageAt: now,
      buyerRead: true,
      sellerRead: false,
    })
    .returning();

  return NextResponse.json({ id: created.id }, { status: 201 });
}

// GET /api/chat/conversations — seznam konverzací přihlášeného uživatele
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ conversations: [] });

  const rows = db
    .select({
      id: conversations.id,
      inzeratId: conversations.inzeratId,
      inzeratNazev: inzeraty.nazev,
      buyerId: conversations.buyerId,
      buyerName: users.name,
      buyerPicture: users.picture,
      sellerId: conversations.sellerId,
      lastMessageAt: conversations.lastMessageAt,
      buyerRead: conversations.buyerRead,
      sellerRead: conversations.sellerRead,
    })
    .from(conversations)
    .leftJoin(inzeraty, eq(conversations.inzeratId, inzeraty.id))
    .leftJoin(users, eq(users.id, conversations.buyerId))
    .where(or(eq(conversations.buyerId, user.id), eq(conversations.sellerId, user.id)))
    .orderBy(desc(conversations.lastMessageAt))
    .all();

  // Připoj poslední zprávu z každé konverzace
  const result = rows.map((row) => {
    const lastMsg = db
      .select({ text: messages.text, senderId: messages.senderId, createdAt: messages.createdAt })
      .from(messages)
      .where(eq(messages.conversationId, row.id))
      .orderBy(desc(messages.createdAt))
      .limit(1)
      .get();

    const isRead = row.buyerId === user.id ? row.buyerRead : row.sellerRead;

    return {
      id: row.id,
      inzeratId: row.inzeratId,
      inzeratNazev: row.inzeratNazev,
      buyerId: row.buyerId,
      buyerName: row.buyerName,
      buyerPicture: row.buyerPicture,
      sellerId: row.sellerId,
      lastMessageAt: row.lastMessageAt,
      lastMessage: lastMsg?.text ?? null,
      lastMessageSenderId: lastMsg?.senderId ?? null,
      isRead,
    };
  });

  return NextResponse.json({ conversations: result });
}
