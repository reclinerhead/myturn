import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/* Schema per the design spec (docs/design/myturn-v1.md, "Data model").
   Everything derivable — next up, averages, star strings, suggestions —
   is computed in lib/derived.ts and never stored. */

export const people = sqliteTable("people", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  monogram: text("monogram").notNull(),
  color: text("color").notNull(),
  photoUrl: text("photo_url"),
  /* Shown as the tag on others' review cards ("Mom", "Aunt"). Nullable —
     the card simply omits the tag when unset. */
  role: text("role"),
});

export const activities = sqliteTable("activities", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["food", "trail"] }).notNull(),
  /* Ordered — array order IS the rotation order. */
  memberIds: text("member_ids", { mode: "json" }).$type<string[]>().notNull(),
  cadenceLabel: text("cadence_label").notNull(),
});

export const places = sqliteTable(
  "places",
  {
    id: text("id").primaryKey(),
    activityId: text("activity_id")
      .notNull()
      .references(() => activities.id),
    name: text("name").notNull(),
  },
  (t) => [
    /* Case-insensitive per activity, so create-on-the-fly in the log flow
       can't produce "Cracker Barrel" and "cracker barrel" twice. */
    uniqueIndex("places_activity_name_unique").on(
      t.activityId,
      sql`lower(${t.name})`,
    ),
  ],
);

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    activityId: text("activity_id")
      .notNull()
      .references(() => activities.id),
    placeId: text("place_id")
      .notNull()
      .references(() => places.id),
    /* ISO date (YYYY-MM-DD) — the day of the outing, not the log time. */
    date: text("date").notNull(),
    pickedById: text("picked_by_id")
      .notNull()
      .references(() => people.id),
    /* Insertion time; tiebreak for same-date events so backfilled rows keep
       a deterministic "latest" ordering. */
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("events_activity_date").on(t.activityId, t.date)],
);

export const reviews = sqliteTable(
  "reviews",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => people.id),
    /* 0 = not rated yet; rows are created empty for every member on save. */
    stars: integer("stars").notNull().default(0),
    /* Optional second rating ("Omelette Quality"); null = not given.
       Separate from stars and excluded from all averages. */
    omeletteQuality: integer("omelette_quality"),
    comment: text("comment"),
    had: text("had"),
    distanceMiles: real("distance_miles"),
    minutes: integer("minutes"),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.personId] }),
    check("reviews_stars_range", sql`${t.stars} BETWEEN 0 AND 5`),
    /* NULL passes a BETWEEN check in SQLite, so this only constrains
       actual values. */
    check(
      "reviews_omelette_quality_range",
      sql`${t.omeletteQuality} BETWEEN 0 AND 5`,
    ),
  ],
);

/* Auth (magic link, epic #1): short-lived one-time tokens sent by email,
   long-lived DB-backed sessions. Only token HASHES are stored. */

export const loginTokens = sqliteTable("login_tokens", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  usedAt: integer("used_at", { mode: "timestamp_ms" }),
  /* Send rate limiting counts rows per email in a window. */
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  personId: text("person_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Person = typeof people.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Place = typeof places.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Review = typeof reviews.$inferSelect;
