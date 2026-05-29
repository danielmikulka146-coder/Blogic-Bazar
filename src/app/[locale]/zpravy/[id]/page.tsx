import { asc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { conversations, inzeraty, messages, users } from "@/db/schemas";
import { getCurrentUser } from "@/lib/auth";
import { ChatClient } from "./ChatClient";

type Props = { params: Promise<{ id: string; locale: string }> };

export default async function ChatPage({ params }: Props) {
  const { id, locale } = await params;
  const convId = Number(id);
  if (!Number.isInteger(convId)) notFound();

  const user = await getCurrentUser();
  // Pokud uživatel není přihlášený (např. otevřel ngrok odkaz z emailu v jiném prohlížeči),
  // pošleme ho na homepage s ?next=, AuthProvider ho po přihlášení vrátí zpátky.
  if (!user) redirect(`/${locale}?next=${encodeURIComponent(`/${locale}/zpravy/${convId}`)}`);

  const conv = db.select().from(conversations).where(eq(conversations.id, convId)).get();
  if (!conv) notFound();
  if (conv.buyerId !== user.id && conv.sellerId !== user.id) notFound();

  // Označit jako přečtené při prvním načtení stránky
  const isBuyer = conv.buyerId === user.id;
  if ((isBuyer && !conv.buyerRead) || (!isBuyer && !conv.sellerRead)) {
    db.update(conversations)
      .set(isBuyer ? { buyerRead: true } : { sellerRead: true })
      .where(eq(conversations.id, convId))
      .run();
  }

  const initialMessages = db
    .select({
      id: messages.id,
      text: messages.text,
      senderId: messages.senderId,
      createdAt: messages.createdAt,
      senderName: users.name,
      senderPicture: users.picture,
    })
    .from(messages)
    .leftJoin(users, eq(users.id, messages.senderId))
    .where(eq(messages.conversationId, convId))
    .orderBy(asc(messages.createdAt))
    .all();

  const otherUserId = isBuyer ? conv.sellerId : conv.buyerId;
  const otherUser = db.select().from(users).where(eq(users.id, otherUserId)).get();
  const inzerat = db
    .select({ id: inzeraty.id, nazev: inzeraty.nazev })
    .from(inzeraty)
    .where(eq(inzeraty.id, conv.inzeratId))
    .get();

  return (
    <ChatClient
      convId={convId}
      currentUserId={user.id}
      isInzeratOwner={conv.sellerId === user.id}
      otherUser={otherUser ? { id: otherUser.id, name: otherUser.name, picture: otherUser.picture } : null}
      inzerat={inzerat ? { id: inzerat.id, nazev: inzerat.nazev } : null}
      initialMessages={initialMessages.map((m) => ({
        id: m.id,
        text: m.text,
        senderId: m.senderId,
        createdAt: m.createdAt,
        senderName: m.senderName ?? "Uživatel",
        senderPicture: m.senderPicture ?? null,
      }))}
    />
  );
}
