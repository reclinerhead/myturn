import { db } from "./index.ts";
import { activities, events, people, places, reviews } from "./schema.ts";
import { localAvatarBytes, saveAvatar } from "../lib/avatars.ts";

/* Provisioning + optional dev fixtures (#33, #40).

   `pnpm db:seed`                 -> real family + activities only (what
                                     production provisioning runs)
   `pnpm db:seed --with-fixtures` -> also the prototype's 7 demo events
   `pnpm db:seed --reset`         -> wipe first (combinable)

   Run `pnpm db:migrate` first on a fresh database. Emails come from .env
   (SEED_EMAIL_*, gitignored); the people table IS the auth allowlist.
   Against Turso (TURSO_DATABASE_URL set) this provisions production;
   local avatar files in data/avatars are pushed through the storage
   layer (Vercel Blob when BLOB_READ_WRITE_TOKEN is set) and photoUrl is
   linked. */

const reset = process.argv.includes("--reset");
const withFixtures = process.argv.includes("--with-fixtures");

function email(envKey: string, fallback: string): string {
  return (process.env[envKey] ?? fallback).trim().toLowerCase();
}

async function installPhoto(personId: string): Promise<string | null> {
  const bytes = localAvatarBytes(personId);
  if (!bytes) return null;
  await saveAvatar(personId, bytes);
  return `/avatars/${personId}?v=${Date.now()}`;
}

const existing = await db.select({ id: people.id }).from(people);
if (existing.length && !reset) {
  console.log(`Database already has ${existing.length} people; skipping seed. Use --reset to wipe and reseed.`);
  process.exit(0);
}

if (reset) {
  await db.delete(reviews);
  await db.delete(events);
  await db.delete(places);
  await db.delete(activities);
  await db.delete(people);
}

/* The real family. Rotation order = memberIds order; position 0 has the
   first turn on an empty history (issue #33: Karen opens breakfast,
   Kathy opens walking). */
await db.insert(people).values([
  { id: "todd", name: "Todd", email: email("SEED_EMAIL_TODD", "todd@example.com"), monogram: "TO", color: "#645c50", role: "Son of Karen", photoUrl: await installPhoto("todd") },
  { id: "karen", name: "Karen", email: email("SEED_EMAIL_KAREN", "karen@example.com"), monogram: "KA", color: "#c67139", role: "Mom", photoUrl: await installPhoto("karen") },
  { id: "chad", name: "Chad", email: email("SEED_EMAIL_CHAD", "chad@example.com"), monogram: "CH", color: "#8c491a", role: "Son of Karen", photoUrl: await installPhoto("chad") },
  { id: "kathy", name: "Kathy", email: email("SEED_EMAIL_KATHY", "kathy@example.com"), monogram: "KY", color: "#7a8a5e", role: "Aunt", photoUrl: await installPhoto("kathy") },
]);

await db.insert(activities).values([
  {
    id: "breakfast",
    name: "Sunday Breakfast",
    kind: "food",
    memberIds: ["karen", "todd", "chad"],
    cadenceLabel: "Sundays · Karen, Todd, Chad",
  },
  {
    id: "walking",
    name: "Friday Walking",
    kind: "trail",
    memberIds: ["kathy", "todd", "karen"],
    cadenceLabel: "Fridays · Kathy, Todd, Karen",
  },
]);

if (withFixtures) {
  /* Prototype demo data — dev only. Written against the prototype's
     memberships, so minor mismatches with the real rotations are
     expected and harmless: the derived helpers tolerate pickers who are
     not current members. */
  await db.insert(places).values([
    { id: "cracker-barrel", activityId: "breakfast", name: "Cracker Barrel" },
    { id: "bob-evans", activityId: "breakfast", name: "Bob Evans" },
    { id: "pancake-shop", activityId: "breakfast", name: "The Pancake Shop" },
    { id: "sycamore-loop", activityId: "walking", name: "Sycamore Loop" },
    { id: "heron-marsh", activityId: "walking", name: "Heron Marsh Boardwalk" },
    { id: "cedar-ridge", activityId: "walking", name: "Cedar Ridge Trail" },
  ]);

  const at = (date: string) => new Date(`${date}T12:00:00Z`);

  await db.insert(events).values([
    { id: "b1", activityId: "breakfast", placeId: "cracker-barrel", date: "2026-08-02", pickedById: "kathy", createdAt: at("2026-08-02") },
    { id: "b2", activityId: "breakfast", placeId: "pancake-shop", date: "2026-08-09", pickedById: "karen", createdAt: at("2026-08-09") },
    { id: "b3", activityId: "breakfast", placeId: "bob-evans", date: "2026-08-16", pickedById: "chad", createdAt: at("2026-08-16") },
    { id: "b4", activityId: "breakfast", placeId: "cracker-barrel", date: "2026-08-23", pickedById: "kathy", createdAt: at("2026-08-23") },
    { id: "w1", activityId: "walking", placeId: "cedar-ridge", date: "2026-08-07", pickedById: "karen", createdAt: at("2026-08-07") },
    { id: "w2", activityId: "walking", placeId: "heron-marsh", date: "2026-08-14", pickedById: "kathy", createdAt: at("2026-08-14") },
    { id: "w3", activityId: "walking", placeId: "sycamore-loop", date: "2026-08-21", pickedById: "karen", createdAt: at("2026-08-21") },
  ]);

  await db.insert(reviews).values([
    { eventId: "b1", personId: "karen", stars: 4 },
    { eventId: "b1", personId: "chad", stars: 4, comment: "Consistent.", had: "Biscuits" },
    { eventId: "b1", personId: "kathy", stars: 4 },
    { eventId: "b2", personId: "karen", stars: 5, comment: "My pick, my rules.", had: "Blueberry stack" },
    { eventId: "b2", personId: "chad", stars: 5, comment: "Genuinely great.", had: "Short stack" },
    { eventId: "b2", personId: "kathy", stars: 4, had: "Coffee, three refills" },
    { eventId: "b3", personId: "karen", stars: 3, comment: "The eggs were shy.", had: "Two eggs, over medium" },
    { eventId: "b3", personId: "chad", stars: 4, had: "Sausage" },
    { eventId: "b3", personId: "kathy", stars: 2, comment: "Chad, we can do better.", had: "Toast" },
    { eventId: "b4", personId: "karen", stars: 4, comment: "Coffee was hot, biscuits were hotter.", had: "Biscuits and gravy" },
    { eventId: "b4", personId: "chad", stars: 3, comment: "Waited 20 minutes for a rocking chair.", had: "Pancakes" },
    { eventId: "b4", personId: "kathy", stars: 5, comment: "I picked. Obviously five.", had: "Hashbrown casserole" },
    { eventId: "w1", personId: "karen", stars: 4, comment: "That hill is a lot.", distanceMiles: 3.0, minutes: 72 },
    { eventId: "w1", personId: "kathy", stars: 0 },
    { eventId: "w2", personId: "karen", stars: 3, comment: "Boardwalk creaks.", distanceMiles: 1.6, minutes: 40 },
    { eventId: "w2", personId: "kathy", stars: 4 },
    { eventId: "w3", personId: "karen", stars: 5, comment: "Shade the whole way.", distanceMiles: 2.1, minutes: 48 },
    { eventId: "w3", personId: "kathy", stars: 4, comment: "Bugs. Otherwise lovely.", distanceMiles: 2.1, minutes: 50 },
  ]);
}

console.log(
  `Seeded: 4 people, 2 activities${withFixtures ? ", 6 places, 7 fixture events, 18 reviews" : " (no fixtures — production provisioning)"}.`,
);
