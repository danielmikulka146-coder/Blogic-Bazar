// Schéma tabulky uživatelů — naši uživatelé se přihlašují výhradně přes Google.
// Žádné heslo, žádný salt — Google za nás řeší bezpečnost přihlášení.
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer().primaryKey({ autoIncrement: true }), // naše interní ID — používáme v cizích klíčích inzerátů
  googleId: text().notNull().unique(), // Google's permanentní ID — primární identifikátor uživatele
  email: text().notNull(),
  name: text().notNull(),
  picture: text(), // URL profilové fotky z Googlu — může být null (starší účty)
  telefon: text(), // uložený telefon z posledního formuláře — předvyplní se příště
  telefonPrefix: text(), // předvolba zvlášť ("+420") — odděleno pro flexibilní formátování
  // mode: "timestamp" = Drizzle automaticky převádí JS Date ↔ SQLite integer (Unix ms timestamp)
  createdAt: integer({ mode: "timestamp" }).notNull(),
});

// $inferSelect = TypeScript typ odvozený přímo ze schématu — automaticky se aktualizuje při změně schématu.
// Nemusíme ručně psát `type User = { id: number; googleId: string; ... }`.
export type User = typeof users.$inferSelect;
