import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { InzeratCard } from "@/app/[locale]/inzeraty/InzeratCard";
import { db } from "@/db";
import { inzeraty } from "@/db/schemas";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";

const INK = "#1a1a1a";
const ORANGE = "#FF5722";
const MUTED = "#888780";
const MONO_STACK = "var(--font-jb-mono), 'Courier New', ui-monospace, monospace";

type Props = { params: Promise<{ locale: string }> };

function plural(n: number): string {
  if (n === 1) return "inzerát";
  if (n >= 2 && n <= 4) return "inzeráty";
  return "inzerátů";
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}`);

  const rows = db
    .select({
      id: inzeraty.id,
      nazev: inzeraty.nazev,
      foto: inzeraty.foto,
      kategorie: inzeraty.kategorie,
      stav: inzeraty.stav,
      stavZbozi: inzeraty.stavZbozi,
      cena: inzeraty.cena,
      free: inzeraty.free,
      soldAt: inzeraty.soldAt,
    })
    .from(inzeraty)
    .where(eq(inzeraty.buyerId, user.id))
    .orderBy(desc(inzeraty.soldAt))
    .all();

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
          Koupené inzeráty
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
          {rows.length} {plural(rows.length)}
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

      {rows.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 16px",
            fontFamily: MONO_STACK,
            color: MUTED,
            fontSize: 14,
          }}
        >
          Zatím jsi nic nekoupil.{" "}
          <Link
            href="/inzeraty"
            style={{
              color: ORANGE,
              textDecoration: "underline",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Projít inzeráty
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
          {rows.map((r) => (
            <InzeratCard
              key={r.id}
              id={r.id}
              nazev={r.nazev}
              foto={r.foto}
              kategorie={r.kategorie}
              stav={r.stav}
              stavZbozi={r.stavZbozi}
              cena={r.cena}
              free={r.free}
            />
          ))}
        </div>
      )}
    </div>
  );
}
