"use server";

import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { activities, events, places, reviews } from "@/db/schema";
import { getSessionPerson } from "@/lib/auth";

/* Creates the event with an empty review row for every member, creating
   the place on the fly (matched case-insensitively per activity) when
   it's new. Anyone signed in can log — the spec's "anyone can submit". */
export async function createEvent(
  activityId: string,
  input: { placeName: string; pickedById: string; date: string },
): Promise<void> {
  const me = await getSessionPerson();
  if (!me) redirect("/login");

  const activity = db
    .select()
    .from(activities)
    .where(eq(activities.id, activityId))
    .get();
  if (!activity) return;
  if (!activity.memberIds.includes(input.pickedById)) return;

  const placeName = input.placeName.trim().slice(0, 120);
  if (!placeName) return;

  const date = /^\d{4}-\d{2}-\d{2}$/.test(input.date)
    ? input.date
    : new Date().toLocaleDateString("en-CA");

  const eventId = randomUUID();
  db.transaction((tx) => {
    let place = tx
      .select()
      .from(places)
      .where(
        and(
          eq(places.activityId, activity.id),
          sql`lower(${places.name}) = lower(${placeName})`,
        ),
      )
      .get();
    if (!place) {
      place = tx
        .insert(places)
        .values({ id: randomUUID(), activityId: activity.id, name: placeName })
        .returning()
        .get();
    }

    tx.insert(events)
      .values({
        id: eventId,
        activityId: activity.id,
        placeId: place.id,
        date,
        pickedById: input.pickedById,
      })
      .run();

    tx.insert(reviews)
      .values(
        activity.memberIds.map((personId) => ({
          eventId,
          personId,
          stars: 0,
        })),
      )
      .run();
  });

  redirect(`/e/${eventId}?saved=1`);
}
