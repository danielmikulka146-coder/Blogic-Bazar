import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schemas";

const SESSION_COOKIE = "bb_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dní

type GoogleTokenInfo = {
  googleId: string;
  email: string;
  name: string;
  picture: string | null;
};

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenInfo | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) return null;

  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, string>;
    if (!data.sub || !data.email) return null;
    if (data.aud !== clientId) return null;
    const iss = data.iss;
    if (iss !== "https://accounts.google.com" && iss !== "accounts.google.com") return null;
    const exp = Number(data.exp);
    if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null;

    return {
      googleId: data.sub,
      email: data.email,
      name: data.name || data.email,
      picture: data.picture || null,
    };
  } catch {
    return null;
  }
}

export async function upsertGoogleUser(info: GoogleTokenInfo) {
  const existing = db.select().from(users).where(eq(users.googleId, info.googleId)).get();
  if (existing) {
    if (existing.email !== info.email || existing.name !== info.name || existing.picture !== info.picture) {
      await db
        .update(users)
        .set({ email: info.email, name: info.name, picture: info.picture })
        .where(eq(users.id, existing.id));
    }
    return { ...existing, email: info.email, name: info.name, picture: info.picture };
  }

  const [created] = await db
    .insert(users)
    .values({
      googleId: info.googleId,
      email: info.email,
      name: info.name,
      picture: info.picture,
      createdAt: new Date(),
    })
    .returning();
  return created;
}

export async function setSessionCookie(userId: number) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, String(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const userId = Number(raw);
  if (!Number.isInteger(userId)) return null;
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  return user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Pro tuto akci musíš být přihlášený");
  return user;
}
