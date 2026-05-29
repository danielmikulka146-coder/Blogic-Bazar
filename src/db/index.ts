import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schemas";

const sqlite = new Database("sqlite.db");

// Auto-migrace pro auth schéma. Drží se idempotentně, takže běh při každém startu
// dev serveru nic nerozbije, ale doplní chybějící sloupce/tabulky pokud chybí.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    googleId TEXT NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    picture TEXT,
    createdAt INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS users_googleId_unique ON users (googleId);

  CREATE TABLE IF NOT EXISTS savedInzeraty (
    userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    inzeratId INTEGER NOT NULL REFERENCES inzeraty(id) ON DELETE CASCADE,
    createdAt INTEGER NOT NULL,
    PRIMARY KEY (userId, inzeratId)
  );
`);

function hasInzeratColumn(name: string): boolean {
  return !!sqlite.prepare("SELECT 1 FROM pragma_table_info('inzeraty') WHERE name = ?").get(name);
}

function hasUsersColumn(name: string): boolean {
  return !!sqlite.prepare("SELECT 1 FROM pragma_table_info('users') WHERE name = ?").get(name);
}

if (!hasUsersColumn("telefon")) {
  sqlite.exec("ALTER TABLE users ADD COLUMN telefon TEXT");
}
if (!hasUsersColumn("telefonPrefix")) {
  sqlite.exec("ALTER TABLE users ADD COLUMN telefonPrefix TEXT");
}

if (!hasInzeratColumn("userId")) {
  sqlite.exec("ALTER TABLE inzeraty ADD COLUMN userId INTEGER REFERENCES users(id)");
}
if (!hasInzeratColumn("reservedBy")) {
  sqlite.exec("ALTER TABLE inzeraty ADD COLUMN reservedBy INTEGER REFERENCES users(id)");
}
if (!hasInzeratColumn("buyerId")) {
  sqlite.exec("ALTER TABLE inzeraty ADD COLUMN buyerId INTEGER REFERENCES users(id)");
}
if (!hasInzeratColumn("paymentDone")) {
  sqlite.exec("ALTER TABLE inzeraty ADD COLUMN paymentDone INTEGER NOT NULL DEFAULT 0");
}
if (!hasInzeratColumn("viewsCount")) {
  sqlite.exec("ALTER TABLE inzeraty ADD COLUMN viewsCount INTEGER NOT NULL DEFAULT 0");
}
if (!hasInzeratColumn("ownerLastSeenViews")) {
  sqlite.exec("ALTER TABLE inzeraty ADD COLUMN ownerLastSeenViews INTEGER NOT NULL DEFAULT 0");
}
if (!hasInzeratColumn("soldAt")) {
  sqlite.exec("ALTER TABLE inzeraty ADD COLUMN soldAt INTEGER");
}

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    inzeratId INTEGER NOT NULL REFERENCES inzeraty(id) ON DELETE CASCADE,
    buyerId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sellerId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    createdAt INTEGER NOT NULL,
    lastMessageAt INTEGER NOT NULL,
    buyerRead INTEGER NOT NULL DEFAULT 1,
    sellerRead INTEGER NOT NULL DEFAULT 0,
    notificationSentAt INTEGER,
    UNIQUE(inzeratId, buyerId)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    conversationId INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    senderId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  );
`);

export const db = drizzle(sqlite, { schema });
