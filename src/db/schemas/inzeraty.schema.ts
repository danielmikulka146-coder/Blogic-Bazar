// Drizzle ORM schéma — TypeScript definice tabulky "inzeraty" v SQLite databázi.
// Drizzle z tohoto schématu generuje SQL migrace (soubory v db/migrations/) a TypeScript typy.
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./users.schema";

export const inzeraty = sqliteTable("inzeraty", {
  id: integer().primaryKey({ autoIncrement: true }), // SQLite automaticky přidělí další číslo
  nazev: text().notNull(),
  popis: text().notNull(),
  kategorie: text().notNull(),
  kontakt: text().notNull(),
  stav: text().notNull(),
  foto: text().notNull(), // JSON array string — SQLite nemá nativní array typ, ukládáme jako text
  cena: integer().notNull(),
  free: integer({ mode: "boolean" }).notNull(), // SQLite nemá boolean — Drizzle ukládá jako 0/1
  telefon: text(), // bez .notNull() = může být NULL (nepovinné pole)
  stavZbozi: text(),
  // Cizí klíče — .references() říká, který sloupec v jiné tabulce je rodič.
  // onDelete: "set null" = pokud uživatel smaže účet, inzerát zůstane, ale userId bude NULL.
  userId: integer().references(() => users.id, { onDelete: "set null" }),
  reservedBy: integer().references(() => users.id, { onDelete: "set null" }), // kdo zarezervoval
  buyerId: integer().references(() => users.id, { onDelete: "set null" }), // kdo koupil
  paymentDone: integer({ mode: "boolean" }).notNull().default(false),
  viewsCount: integer().notNull().default(0),
  ownerLastSeenViews: integer().notNull().default(0), // baseline pro výpočet "nových zobrazení od poslední návštěvy"
  soldAt: integer(), // Unix timestamp prodeje — null pokud ještě neprodáno
  createdAt: integer()
    .notNull()
    .default(0)
    // $defaultFn = JavaScript funkce volaná při insertu (doplní aktuální čas).
    // Pozor: v některých verzích Drizzle souběh s .default(0) způsobí, že SQL default vyhraje.
    // Proto v actions.ts nastavujeme createdAt ručně: Math.floor(Date.now() / 1000).
    .$defaultFn(() => Math.floor(Date.now() / 1000)),
});
