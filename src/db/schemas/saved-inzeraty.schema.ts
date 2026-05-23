import { integer, primaryKey, sqliteTable } from "drizzle-orm/sqlite-core";

import { inzeraty } from "./inzeraty.schema";
import { users } from "./users.schema";

export const savedInzeraty = sqliteTable(
  "savedInzeraty",
  {
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    inzeratId: integer()
      .notNull()
      .references(() => inzeraty.id, { onDelete: "cascade" }),
    createdAt: integer({ mode: "timestamp" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.inzeratId] })],
);

export type SavedInzerat = typeof savedInzeraty.$inferSelect;
