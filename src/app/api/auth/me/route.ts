// GET /api/auth/me — vrátí přihlášeného uživatele na základě session cookie.
// AuthProvider tuto route volá při startu aplikace, aby zjistil jestli má platnou session.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser(); // přečte cookie → ověří userId → načte z DB
  if (!user) {
    // Vrátíme { user: null } místo 401 — klient se jen dozví "nikdo není přihlášen", nechceme error.
    return NextResponse.json({ user: null });
  }
  // Vracíme jen potřebná pole — ne celý DB objekt (který by mohl mít citlivá interní data).
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
