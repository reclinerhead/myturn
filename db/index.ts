import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema.ts";

/* One in-process connection, opened (and migrated) on first import. Cached on
   globalThis so Next.js dev-mode module reloads reuse it. */

const globalForDb = globalThis as unknown as {
  myturnDb?: BetterSQLite3Database<typeof schema>;
};

function open(): BetterSQLite3Database<typeof schema> {
  const dbPath = process.env.DATABASE_PATH ?? "./data/myturn.db";
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const database = drizzle(sqlite, { schema });
  /* Read at runtime via fs, so Next's standalone output tracing won't pick
     the folder up on its own — the first PR that imports this module from
     app code must add db/migrations to outputFileTracingIncludes. */
  migrate(database, {
    migrationsFolder: path.join(process.cwd(), "db", "migrations"),
  });
  return database;
}

export const db = (globalForDb.myturnDb ??= open());
