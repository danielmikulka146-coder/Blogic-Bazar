import { and, asc, eq, isNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { conversations, inzeraty, messages, users } from "@/db/schemas";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/chat/conversations/[id]/messages — zprávy + info o konverzaci
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const { id } = await params;
  const convId = Number(id);
  if (!Number.isInteger(convId)) return NextResponse.json({ error: "Neplatné ID" }, { status: 400 });

  const conv = db.select().from(conversations).where(eq(conversations.id, convId)).get();
  if (!conv) return NextResponse.json({ error: "Konverzace nenalezena" }, { status: 404 });
  if (conv.buyerId !== user.id && conv.sellerId !== user.id) {
    return NextResponse.json({ error: "Nemáš přístup" }, { status: 403 });
  }

  // Označit jako přečtené
  const isBuyer = conv.buyerId === user.id;
  if ((isBuyer && !conv.buyerRead) || (!isBuyer && !conv.sellerRead)) {
    await db
      .update(conversations)
      .set(isBuyer ? { buyerRead: true } : { sellerRead: true })
      .where(eq(conversations.id, convId));
  }

  const msgs = db
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

  // Načti info druhé strany
  const otherUserId = isBuyer ? conv.sellerId : conv.buyerId;
  const otherUser = db.select().from(users).where(eq(users.id, otherUserId)).get();

  return NextResponse.json({
    conv: {
      id: conv.id,
      inzeratId: conv.inzeratId,
      buyerId: conv.buyerId,
      sellerId: conv.sellerId,
    },
    otherUser: otherUser ? { id: otherUser.id, name: otherUser.name, picture: otherUser.picture } : null,
    messages: msgs,
    currentUserId: user.id,
  });
}

// POST /api/chat/conversations/[id]/messages — odeslat zprávu
export async function POST(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const { id } = await params;
  const convId = Number(id);
  if (!Number.isInteger(convId)) return NextResponse.json({ error: "Neplatné ID" }, { status: 400 });

  const conv = db.select().from(conversations).where(eq(conversations.id, convId)).get();
  if (!conv) return NextResponse.json({ error: "Konverzace nenalezena" }, { status: 404 });
  if (conv.buyerId !== user.id && conv.sellerId !== user.id) {
    return NextResponse.json({ error: "Nemáš přístup" }, { status: 403 });
  }

  const body = (await req.json()) as { text?: string };
  const text = body.text?.trim();
  if (!text) return NextResponse.json({ error: "Zpráva je prázdná" }, { status: 400 });

  const now = Math.floor(Date.now() / 1000);
  const [msg] = await db
    .insert(messages)
    .values({ conversationId: convId, senderId: user.id, text, createdAt: now })
    .returning();

  const isBuyer = conv.buyerId === user.id;

  await db
    .update(conversations)
    .set({
      lastMessageAt: now,
      buyerRead: isBuyer,
      sellerRead: !isBuyer,
    })
    .where(eq(conversations.id, convId));

  // Email notifikace prodejci POUZE při první zprávě v konverzaci.
  // Atomický update s podmínkou notificationSentAt IS NULL zabrání race condition (dvojí odeslání).
  if (isBuyer && conv.notificationSentAt == null) {
    const claimed = await db
      .update(conversations)
      .set({ notificationSentAt: now })
      .where(and(eq(conversations.id, convId), isNull(conversations.notificationSentAt)))
      .returning({ id: conversations.id });

    if (claimed.length > 0) {
      void sendFirstMessageNotification(conv.sellerId, conv.inzeratId, convId, user.name, text).catch((err) => {
        console.error("[Email] Chyba při odesílání notifikace:", err);
      });
    }
  }

  return NextResponse.json(
    { message: { ...msg, senderName: user.name, senderPicture: user.picture } },
    { status: 201 },
  );
}

async function sendFirstMessageNotification(
  sellerId: number,
  inzeratId: number,
  convId: number,
  senderName: string,
  messageText: string,
) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) {
    console.warn("[Email] Chybí GMAIL_USER nebo GMAIL_APP_PASSWORD v .env.local — notifikace přeskočena");
    return;
  }

  const seller = db.select().from(users).where(eq(users.id, sellerId)).get();
  if (!seller) return;

  const inzerat = db.select({ nazev: inzeraty.nazev }).from(inzeraty).where(eq(inzeraty.id, inzeratId)).get();
  const inzeratNazev = inzerat?.nazev ?? `Inzerát č. ${inzeratId}`;

  const { createTransport } = await import("nodemailer");
  const { isWoman } = await import("czech-vocative");

  const transporter = createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass.replace(/\s/g, "") },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const chatUrl = `${baseUrl}/cs/zpravy/${convId}`;
  const preview = messageText.length > 200 ? `${messageText.slice(0, 200)}…` : messageText;
  const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] ?? c);

  // czech-vocative: isWoman pracuje s křestním jménem → vezmeme první slovo
  const firstName = senderName.trim().split(/\s+/)[0] ?? senderName;
  const female = isWoman(firstName);
  const poslalVerb = female ? "poslala" : "poslal"; // "ti poslal/a zprávu"

  const html = [
    '<div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #FBFAF6; border: 2px solid #1a1a1a;">',
    '<h2 style="margin: 0 0 8px; font-size: 20px; color: #1a1a1a;">Máš novou zprávu!</h2>',
    `<p style="margin: 0 0 16px; color: #888780; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; font-weight: 700;">Inzerát: ${esc(inzeratNazev)}</p>`,
    `<p style="margin: 0 0 12px; color: #444;"><strong>${esc(senderName)}</strong> má zájem o tvůj inzerát a ${poslalVerb} ti zprávu:</p>`,
    `<blockquote style="margin: 12px 0 20px; padding: 12px 16px; background: #fff; border-left: 3px solid #FF5722; color: #1a1a1a; font-style: italic;">${esc(preview)}</blockquote>`,
    `<a href="${chatUrl}" style="display: inline-block; padding: 12px 20px; background: #FF5722; color: #4A1B0C; font-weight: 700; text-decoration: none; letter-spacing: 0.04em; text-transform: uppercase; font-size: 13px;">Otevřít chat →</a>`,
    '<p style="margin: 24px 0 0; font-size: 11px; color: #888780;">Blogic Bazar · odpovídej v chatu na webu, ne emailem</p>',
    "</div>",
  ].join("");

  const info = await transporter.sendMail({
    from: `"Blogic Bazar" <${gmailUser}>`,
    to: seller.email,
    subject: `${senderName} má zájem o tvůj inzerát „${inzeratNazev}"`,
    html,
  });
  console.log(`[Email] Notifikace odeslána na ${seller.email}, messageId: ${info.messageId}`);
}
