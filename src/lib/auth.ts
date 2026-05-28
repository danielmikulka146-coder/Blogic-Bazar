// Veškerá autentizační logika — ověření Google tokenu, správa session cookie, DB operace s uživateli.
// Tento soubor běží VŽDY na serveru (importuje cookies z next/headers, přistupuje k DB).
import { eq } from "drizzle-orm";
import { cookies } from "next/headers"; // cookies() funguje jen na serveru — čte HTTP request headers
import { db } from "@/db";
import { users } from "@/db/schemas";

const SESSION_COOKIE = "bb_session"; // název cookie — "bb" = Blogic Bazar
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dní v sekundách = jak dlouho session vydrží

// Data, která dostaneme z Google po ověření tokenu.
type GoogleTokenInfo = {
  googleId: string; // Google's unikátní ID uživatele — používáme jako primární identifikátor (email se může změnit)
  email: string;
  name: string;
  picture: string | null;
};

// Ověří Google ID token — pošleme ho Google API a oni potvrdí, že je platný a nebyl zfalšován.
// Alternativa by bylo ověřit JWT podpis lokálně (rychlejší), ale tohle je jednodušší a spolehlivé.
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenInfo | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) return null;

  try {
    // Google's tokeninfo endpoint ověří podpis a vrátí obsah tokenu.
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, {
      cache: "no-store", // vždy čerstvé — token se mění, cachovaná odpověď by mohla být zastaralá
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, string>;
    if (!data.sub || !data.email) return null;
    // Ověření, že token byl vydán PRO NÁŠ client ID — jinak by aplikace přijala tokeny z jiných webů.
    if (data.aud !== clientId) return null;
    // Ověření vydavatele — token musí pocházet od Googlu, ne od kohokoliv jiného.
    const iss = data.iss;
    if (iss !== "https://accounts.google.com" && iss !== "accounts.google.com") return null;
    // Ověření expirace — token má krátkou platnost (hodiny), vypršelý odmítneme.
    const exp = Number(data.exp);
    if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null;

    return {
      googleId: data.sub, // "sub" = subject = Google's unikátní ID tohoto uživatele
      email: data.email,
      name: data.name || data.email, // fallback na email pokud jméno chybí (vzácné)
      picture: data.picture || null,
    };
  } catch {
    return null; // síťová chyba, neplatný JSON apod. — zacházíme stejně jako s neplatným tokenem
  }
}

// Upsert = UPDATE nebo INSERT — "přihlas nebo zaregistruj" v jedné funkci.
// Vyhledáváme podle googleId (ne emailu) — email se může změnit, Google ID je permanentní.
export async function upsertGoogleUser(info: GoogleTokenInfo) {
  const existing = db.select().from(users).where(eq(users.googleId, info.googleId)).get();
  if (existing) {
    // Uživatel existuje — aktualizujeme jen pokud se něco změnilo (nové jméno, profilová fotka z Googlu).
    // Podmínka zabrání zbytečnému DB write při každém přihlášení.
    if (existing.email !== info.email || existing.name !== info.name || existing.picture !== info.picture) {
      await db
        .update(users)
        .set({ email: info.email, name: info.name, picture: info.picture })
        .where(eq(users.id, existing.id));
    }
    // Vracíme objekt s čerstvými daty z Googlu (ne ze staré DB cache).
    return { ...existing, email: info.email, name: info.name, picture: info.picture };
  }

  // Nový uživatel — první přihlášení, vytvoříme účet.
  const [created] = await db
    .insert(users)
    .values({
      googleId: info.googleId,
      email: info.email,
      name: info.name,
      picture: info.picture,
      createdAt: new Date(),
    })
    .returning(); // .returning() = vrátí kompletní vložený záznam včetně auto-generated id
  return created;
}

// Nastaví session cookie s ID uživatele — prohlížeč ji pak automaticky posílá s každým requestem.
export async function setSessionCookie(userId: number) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, String(userId), {
    httpOnly: true, // JavaScript v prohlížeči tuto cookie nemůže přečíst — ochrana proti XSS útokům
    sameSite: "lax", // "lax" = cookie se pošle při navigaci na web, ne při cross-site requestech (CSRF ochrana)
    secure: process.env.NODE_ENV === "production", // HTTPS only v produkci, HTTP povoleno lokálně
    path: "/", // cookie platí pro celý web
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

// Smaže session cookie — volá se při odhlášení.
export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

// Přečte session cookie a načte uživatele z DB — volá se při každém server requestu kde potřebujeme vědět kdo jsme.
export async function getCurrentUser() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value; // ?. = bezpečný přístup pokud cookie neexistuje
  if (!raw) return null; // žádná cookie = nepřihlášen
  const userId = Number(raw);
  if (!Number.isInteger(userId)) return null; // bezpečnostní check — cookie nesmí obsahovat nesmysly
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  return user ?? null; // ?? null = explicitní null místo undefined
}

// Jako getCurrentUser, ale hodí chybu pokud uživatel není přihlášen.
// Používá se v server actions kde nepřihlášený uživatel nesmí vůbec pokračovat.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Pro tuto akci musíš být přihlášený");
  return user;
}
