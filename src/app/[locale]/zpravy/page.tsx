import { desc, eq, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { conversations, inzeraty, messages, users } from "@/db/schemas";
import { getCurrentUser } from "@/lib/auth";
import { ZpravyInboxClient } from "./ZpravyInboxClient";

type Props = { params: Promise<{ locale: string }> };

export default async function ZpravyPage({ params }: Props) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}?next=${encodeURIComponent(`/${locale}/zpravy`)}`);

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

  const convList = rows.map((row) => {
    const lastMsg = db
      .select({ text: messages.text, senderId: messages.senderId })
      .from(messages)
      .where(eq(messages.conversationId, row.id))
      .orderBy(desc(messages.createdAt))
      .limit(1)
      .get();

    // Načti prodejce (druhá strana pro kupce)
    const seller = db
      .select({ name: users.name, picture: users.picture })
      .from(users)
      .where(eq(users.id, row.sellerId))
      .get();

    return {
      id: row.id,
      inzeratId: row.inzeratId,
      inzeratNazev: row.inzeratNazev ?? "Inzerát",
      buyerId: row.buyerId,
      buyerName: row.buyerName ?? "Uživatel",
      buyerPicture: row.buyerPicture ?? null,
      sellerId: row.sellerId,
      sellerName: seller?.name ?? "Uživatel",
      sellerPicture: seller?.picture ?? null,
      lastMessageAt: row.lastMessageAt,
      lastMessage: lastMsg?.text ?? null,
      lastMessageSenderId: lastMsg?.senderId ?? null,
      isRead: row.buyerId === user.id ? row.buyerRead : row.sellerRead,
    };
  });

  return <ZpravyInboxClient conversations={convList} currentUserId={user.id} />;
}
