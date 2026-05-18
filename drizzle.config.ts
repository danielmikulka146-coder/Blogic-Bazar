import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  dbCredentials: {
    url: "./sqlite.db",
  },
  schema: "./src/db/schemas",
  out: "./src/db/migrations",
});
