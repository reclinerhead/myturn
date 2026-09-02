import { mkdirSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema.ts";

/* Turso (libSQL) in production — TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
   from the Vercel env. Local dev needs no cloud account: with those unset
   the client opens a local SQLite file instead.

   Migrations are NOT applied here (serverless functions must never race
   DDL): run `pnpm db:migrate` explicitly after schema changes and at
   provisioning (#40). */

const globalForDb = globalThis as unknown as {
  myturnDb?: LibSQLDatabase<typeof schema>;
  myturnClient?: Client;
};

function open(): LibSQLDatabase<typeof schema> {
  let config;
  if (process.env.TURSO_DATABASE_URL) {
    config = {
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    };
  } else {
    /* The file client opens eagerly — the directory must exist first
       (build containers and fresh checkouts have no data/ yet). */
    mkdirSync("./data", { recursive: true });
    config = { url: "file:./data/myturn.db" };
  }
  const client = createClient(config);
  globalForDb.myturnClient = client;
  return drizzle(client, { schema });
}

export const db = (globalForDb.myturnDb ??= open());
