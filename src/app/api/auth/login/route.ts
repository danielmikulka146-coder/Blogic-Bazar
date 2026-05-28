// API route pro přihlášení přes Google OAuth.
// Flow: Google tlačítko → Google vrátí "credential" token → my ho ověříme → vytvoříme session.
import { NextResponse } from "next/server";
import { setSessionCookie, upsertGoogleUser, verifyGoogleIdToken } from "@/lib/auth";

// Next.js App Router — exportovaná funkce s názvem HTTP metody = handler pro danou metodu.
// POST /api/auth/login → tato funkce
export async function POST(request: Request) {
  let body: { credential?: string };
  try {
    body = await request.json();
  } catch {
    // Pokud tělo není validní JSON, vrátíme 400 Bad Request.
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const credential = body?.credential;
  if (!credential || typeof credential !== "string") {
    return NextResponse.json({ error: "missing_credential" }, { status: 400 });
  }

  // verifyGoogleIdToken ověří podpis JWT tokenu pomocí Google's veřejného klíče.
  // Pokud je token platný, vrátí info o uživateli (email, jméno, profilová fotka).
  const info = await verifyGoogleIdToken(credential);
  if (!info) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 }); // 401 = neautorizováno
  }

  // upsert = INSERT pokud uživatel neexistuje, UPDATE pokud existuje (aktualizuje jméno/foto z Googlu).
  const user = await upsertGoogleUser(info);
  // Nastaví HttpOnly cookie se session tokenem — HttpOnly = JavaScript v prohlížeči ji nemůže přečíst (XSS ochrana).
  await setSessionCookie(user.id);

  // Vrátíme data uživatele klientu — client si je uloží do AuthProvider contextu.
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      telefon: user.telefon,
      telefonPrefix: user.telefonPrefix,
    },
  });
}
