import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const systemSetting = sqliteTable("systemSetting", {
  name: text().primaryKey(),
  value: text().notNull(),
});

export type SystemSetting = typeof systemSetting.$inferSelect;
