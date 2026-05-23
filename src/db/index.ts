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

const hasUserIdCol = sqlite.prepare("SELECT 1 FROM pragma_table_info('inzeraty') WHERE name = ?").get("userId");
if (!hasUserIdCol) {
  sqlite.exec("ALTER TABLE inzeraty ADD COLUMN userId INTEGER REFERENCES users(id)");
}

export const db = drizzle(sqlite, { schema });
