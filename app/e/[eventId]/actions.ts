"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activities, events, reviews } from "@/db/schema";
import { getSessionPerson } from "@/lib/auth";

export type ReviewPatch = {
  stars?: number;
  omeletteQuality?: number | null;
  comment?: string;
  had?: string;
  distanceMiles?: string;
  minutes?: string;
};

const TEXT_MAX = 500;

function cleanText(value: string): string | null {
  const trimmed = value.trim().slice(0, TEXT_MAX);
  return trimmed === "" ? null : trimmed;
}

/* Writes the signed-in person's review of one event. Whitelisted,
   clamped fields only; the client sends raw input strings for the
   numeric extras and this is where they become numbers or null. */
export async function updateMyReview(
  eventId: string,
  patch: ReviewPatch,
): Promise<void> {
  const me = await getSessionPerson();
  if (!me) return;

  const event = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .get();
  if (!event) return;
  const activity = await db
    .select()
    .from(activities)
    .where(eq(activities.id, event.activityId))
    .get();
  if (!activity?.memberIds.includes(me.id)) return;

  const update: Record<string, unknown> = {};
  if (patch.stars !== undefined) {
    const stars = Math.round(patch.stars);
    if (stars < 1 || stars > 5) return;
    update.stars = stars;
  }
  if (patch.omeletteQuality !== undefined) {
    if (patch.omeletteQuality === null) {
      update.omeletteQuality = null;
    } else {
      const q = Math.round(patch.omeletteQuality);
      if (q < 0 || q > 5) return;
      /* Food only — a trail review never carries an omelette. */
      if (activity.kind !== "food") return;
      update.omeletteQuality = q;
    }
  }
  if (patch.comment !== undefined) update.comment = cleanText(patch.comment);
  if (patch.had !== undefined) {
    if (activity.kind !== "food") return;
    update.had = cleanText(patch.had);
  }
  if (patch.distanceMiles !== undefined) {
    if (activity.kind !== "trail") return;
    const miles = Number.parseFloat(patch.distanceMiles);
    update.distanceMiles =
      Number.isFinite(miles) && miles >= 0 ? miles : null;
  }
  if (patch.minutes !== undefined) {
    if (activity.kind !== "trail") return;
    const minutes = Number.parseInt(patch.minutes, 10);
    update.minutes =
      Number.isFinite(minutes) && minutes >= 0 ? minutes : null;
  }
  if (Object.keys(update).length === 0) return;

  /* Review rows are created with the event (#20); upsert covers any
     member added after the fact. */
  await db
    .insert(reviews)
    .values({ eventId, personId: me.id, stars: 0, ...update })
    .onConflictDoUpdate({
      target: [reviews.eventId, reviews.personId],
      set: update,
    });
}
