import { db } from "./index.ts";
import { activities, events, people, places, reviews } from "./schema.ts";

/* Seed fixtures from the prototype's logic class
   (docs/design/myturn.dc.html): Karen / Chad / Kathy, two activities,
   4 breakfasts + 3 walks with the real comments.

   Run with `pnpm db:seed`. No-op when people already exist;
   `pnpm db:seed --reset` wipes and reseeds (dev convenience — do not run
   against real family data). Emails are placeholders until the auth
   allowlist lands with #17. */

const reset = process.argv.includes("--reset");

const existing = db.select({ id: people.id }).from(people).all();
if (existing.length && !reset) {
  console.log(`Database already has ${existing.length} people; skipping seed. Use --reset to wipe and reseed.`);
  process.exit(0);
}

if (reset) {
  db.delete(reviews).run();
  db.delete(events).run();
  db.delete(places).run();
  db.delete(activities).run();
  db.delete(people).run();
}

db.insert(people).values([
  { id: "karen", name: "Karen", email: "karen@example.com", monogram: "KA", color: "#c67139" },
  { id: "chad", name: "Chad", email: "chad@example.com", monogram: "CH", color: "#8c491a" },
  { id: "kathy", name: "Kathy", email: "kathy@example.com", monogram: "KY", color: "#7a8a5e" },
]).run();

db.insert(activities).values([
  {
    id: "breakfast",
    name: "Sunday Breakfast",
    kind: "food",
    memberIds: ["karen", "chad", "kathy"],
    cadenceLabel: "Sundays · Karen, Chad, Kathy",
  },
  {
    id: "walking",
    name: "Friday Walking",
    kind: "trail",
    memberIds: ["karen", "kathy"],
    cadenceLabel: "Fridays · Karen, Kathy",
  },
]).run();

db.insert(places).values([
  { id: "cracker-barrel", activityId: "breakfast", name: "Cracker Barrel" },
  { id: "bob-evans", activityId: "breakfast", name: "Bob Evans" },
  { id: "pancake-shop", activityId: "breakfast", name: "The Pancake Shop" },
  { id: "sycamore-loop", activityId: "walking", name: "Sycamore Loop" },
  { id: "heron-marsh", activityId: "walking", name: "Heron Marsh Boardwalk" },
  { id: "cedar-ridge", activityId: "walking", name: "Cedar Ridge Trail" },
]).run();

function at(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

db.insert(events).values([
  { id: "b1", activityId: "breakfast", placeId: "cracker-barrel", date: "2026-08-02", pickedById: "kathy", createdAt: at("2026-08-02") },
  { id: "b2", activityId: "breakfast", placeId: "pancake-shop", date: "2026-08-09", pickedById: "karen", createdAt: at("2026-08-09") },
  { id: "b3", activityId: "breakfast", placeId: "bob-evans", date: "2026-08-16", pickedById: "chad", createdAt: at("2026-08-16") },
  { id: "b4", activityId: "breakfast", placeId: "cracker-barrel", date: "2026-08-23", pickedById: "kathy", createdAt: at("2026-08-23") },
  { id: "w1", activityId: "walking", placeId: "cedar-ridge", date: "2026-08-07", pickedById: "karen", createdAt: at("2026-08-07") },
  { id: "w2", activityId: "walking", placeId: "heron-marsh", date: "2026-08-14", pickedById: "kathy", createdAt: at("2026-08-14") },
  { id: "w3", activityId: "walking", placeId: "sycamore-loop", date: "2026-08-21", pickedById: "karen", createdAt: at("2026-08-21") },
]).run();

db.insert(reviews).values([
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
]).run();

console.log("Seeded: 3 people, 2 activities, 6 places, 7 events, 18 reviews.");
