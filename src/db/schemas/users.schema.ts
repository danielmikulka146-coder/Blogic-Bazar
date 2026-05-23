import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer().primaryKey({ autoIncrement: true }),
  googleId: text().notNull().unique(),
  email: text().notNull(),
  name: text().notNull(),
  picture: text(),
  createdAt: integer({ mode: "timestamp" }).notNull(),
});

export type User = typeof users.$inferSelect;
