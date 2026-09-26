"use server";

import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { activities, events, places, reviews } from "@/db/schema";
import { getSessionPerson } from "@/lib/auth";
import { duplicateCandidate } from "@/lib/derived";

/** What the form needs to say "Chad already logged Full City Cafe". */
export type LoggedEvent = {
  id: string;
  date: string;
  placeName: string;
  pickedById: string;
  createdAt?: Date;
};

/* Creates the event with an empty review row for every member, creating
   the place on the fly (matched case-insensitively per activity) when
   it's new. Anyone signed in can log — the spec's "anyone can submit".

   Refuses to log what looks like a repeat (#66): an event in this
   activity within a few days of the submitted date, unless the caller
   explicitly says it was a different outing. The form checks the same
   thing live, but the server is the guard — the race that caused the
   incident is exactly "someone else logged it after the form opened". */
export async function createEvent(
  activityId: string,
  input: {
    placeName: string;
    pickedById: string;
    date: string;
    allowDuplicate?: boolean;
  },
): Promise<{ duplicate: LoggedEvent } | undefined> {
  const me = await getSessionPerson();
  if (!me) redirect("/login");

  const activity = await db
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

  if (!input.allowDuplicate) {
    const existing = await db
      .select({
        id: events.id,
        date: events.date,
        placeName: places.name,
        pickedById: events.pickedById,
        createdAt: events.createdAt,
      })
      .from(events)
      .innerJoin(places, eq(events.placeId, places.id))
      .where(eq(events.activityId, activity.id));
    const duplicate = duplicateCandidate(existing, date);
    if (duplicate) return { duplicate };
  }

  const eventId = randomUUID();
  await db.transaction(async (tx) => {
    let place = await tx
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
      place = await tx
        .insert(places)
        .values({ id: randomUUID(), activityId: activity.id, name: placeName })
        .returning()
        .get();
    }

    await tx.insert(events).values({
      id: eventId,
      activityId: activity.id,
      placeId: place.id,
      date,
      pickedById: input.pickedById,
    });

    await tx.insert(reviews).values(
      activity.memberIds.map((personId) => ({
        eventId,
        personId,
        stars: 0,
      })),
    );
  });

  redirect(`/e/${eventId}?saved=1`);
}
