// Server Component — ověří přihlášení a načte inzeráty uživatele přímo z DB.
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation"; // redirect() = přesměruje na jinou stránku, zastaví vykonávání
import { db } from "@/db";
import { inzeraty } from "@/db/schemas";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MojeInzeratyClient } from "./MojeInzeratyClient";

const INK = "#1a1a1a";
const ORANGE = "#FF5722";
const MUTED = "#888780";
const MONO_STACK = "var(--font-jb-mono), 'Courier New', ui-monospace, monospace";

type Props = { params: Promise<{ locale: string }> };

// Česká pluralizace — "1 inzerát", "2 inzeráty", "5 inzerátů".
// Nelze použít jednoduché `n === 1 ? "inzerát" : "inzerátů"` protože čeština má tři tvary.
function plural(n: number): string {
  if (n === 1) return "inzerát";
  if (n >= 2 && n <= 4) return "inzeráty";
  return "inzerátů";
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  const user = await getCurrentUser();
  // Ochrana stránky na serveru — nepřihlášený uživatel se okamžitě přesměruje na hlavní stránku.
  // Lepší než client-side redirect: stránka se vůbec nevykreslí, žádný "bliknutí" obsahu.
  if (!user) redirect(`/${locale}`);

  // Načteme VŠECHNY inzeráty uživatele — i prodané a zarezervované (na rozdíl od veřejného listu).
  const data = await db.select().from(inzeraty).where(eq(inzeraty.userId, user.id)).all();

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "8px 0 48px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <h1
          style={{
            fontFamily: MONO_STACK,
            fontWeight: 700,
            fontSize: 28,
            color: INK,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          Moje inzeráty
        </h1>
        <span
          style={{
            fontFamily: MONO_STACK,
            fontSize: 12,
            color: MUTED,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 600,
          }}
        >
          {data.length} {plural(data.length)}
        </span>
      </div>

      <div
        aria-hidden
        style={{
          height: 0,
          borderTop: `2px dotted ${INK}`,
          opacity: 0.3,
          marginBottom: 20,
        }}
      />

      {data.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 16px",
            fontFamily: MONO_STACK,
            color: MUTED,
            fontSize: 14,
          }}
        >
          Zatím nemáš žádné inzeráty.{" "}
          <Link
            href="/novy-inzerat"
            style={{
              color: ORANGE,
              textDecoration: "underline",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Přidat první
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, 300px)",
            gap: 14,
            justifyContent: "center",
          }}
        >
          <MojeInzeratyClient data={data} />
        </div>
      )}
    </div>
  );
}
