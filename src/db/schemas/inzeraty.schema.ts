import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const inzeraty = sqliteTable("inzeraty", {
  id: integer().primaryKey({ autoIncrement: true }),
  nazev: text().notNull(),
  popis: text().notNull(),
  kategorie: text().notNull(),
  kontakt: text().notNull(),
  stav: text().notNull(),
  foto: text().notNull(),
  cena: integer().notNull(),
  free: integer({ mode: "boolean" }).notNull(),
  qrPlatba: integer({ mode: "boolean" }).notNull().default(false),
  telefon: text(),
});
