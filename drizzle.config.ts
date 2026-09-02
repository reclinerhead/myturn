import { defineConfig } from "drizzle-kit";

/* Same SQLite dialect either way — `turso` just adds authToken transport.
   Locally (no TURSO_DATABASE_URL) generate/migrate run against the dev
   file. */
export default defineConfig(
  process.env.TURSO_DATABASE_URL
    ? {
        dialect: "turso",
        schema: "./db/schema.ts",
        out: "./db/migrations",
        dbCredentials: {
          url: process.env.TURSO_DATABASE_URL,
          authToken: process.env.TURSO_AUTH_TOKEN,
        },
      }
    : {
        dialect: "sqlite",
        schema: "./db/schema.ts",
        out: "./db/migrations",
        dbCredentials: { url: "./data/myturn.db" },
      },
);
