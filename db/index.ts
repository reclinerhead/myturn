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
  /* Migrations run on first import at server startup — but NOT during
     `next build`, whose parallel page-data workers each import this
     module and would race the DDL on a fresh database (intermittent
     SQLITE_ERROR in the Docker CI build). The migrations folder is
     traced into standalone output via outputFileTracingIncludes. */
  if (process.env.NEXT_PHASE !== "phase-production-build") {
    migrate(database, {
      migrationsFolder: path.join(process.cwd(), "db", "migrations"),
    });
  }
  return database;
}

export const db = (globalForDb.myturnDb ??= open());
