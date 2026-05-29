import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { inzeraty } from "./inzeraty.schema";
import { users } from "./users.schema";

export const conversations = sqliteTable("conversations", {
  id: integer().primaryKey({ autoIncrement: true }),
  inzeratId: integer()
    .notNull()
    .references(() => inzeraty.id, { onDelete: "cascade" }),
  buyerId: integer()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sellerId: integer()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer()
    .notNull()
    .$defaultFn(() => Math.floor(Date.now() / 1000)),
  lastMessageAt: integer()
    .notNull()
    .$defaultFn(() => Math.floor(Date.now() / 1000)),
  buyerRead: integer({ mode: "boolean" }).notNull().default(true),
  sellerRead: integer({ mode: "boolean" }).notNull().default(false),
  // Zapamatuje email prodejce v době prvního odeslání — použijeme pro notifikaci
  notificationSentAt: integer(), // null = notifikace ještě nebyla odeslána
});

export const messages = sqliteTable("messages", {
  id: integer().primaryKey({ autoIncrement: true }),
  conversationId: integer()
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  senderId: integer()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  text: text().notNull(),
  createdAt: integer()
    .notNull()
    .$defaultFn(() => Math.floor(Date.now() / 1000)),
});

export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
