/* Derived values — computed at render time, never persisted (spec:
   docs/design/myturn-v1.md, "Data model"). Pure functions over plain
   shapes so they stay testable without a database. */

/** The fields ordering and rotation need; satisfied by db Event rows. */
export type RotationEvent = {
  id: string;
  date: string; // ISO YYYY-MM-DD
  pickedById: string;
  createdAt?: Date;
};

export type SuggestionEvent = {
  id: string;
  date: string;
  placeName: string;
  createdAt?: Date;
};

/* Newest first: outing date, then insertion time, then id — so backfilled
   rows (inserted late with an earlier date) never masquerade as latest,
   and same-date events stay deterministic. Also the display order for
   history lists. */
export function newestFirst<
  T extends { id: string; date: string; createdAt?: Date },
>(events: T[]): T[] {
  return [...events].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0) ||
      b.id.localeCompare(a.id),
  );
}

/** The activity's most recent event under the ordering above. */
export function latestEvent<
  T extends { id: string; date: string; createdAt?: Date },
>(events: T[]): T | undefined {
  return newestFirst(events)[0];
}

/**
 * Whose turn is next: the member after the latest event's picker, wrapping.
 * `memberIds[0]` when there is no history. Because it derives from the last
 * picker, a manual swap on the log form automatically re-bases the rotation.
 * A latest picker who is no longer a member indexes to -1, which lands on
 * `memberIds[0]`.
 */
export function nextUp(
  activity: { memberIds: string[] },
  events: RotationEvent[],
): string {
  const latest = latestEvent(events);
  if (!latest) return activity.memberIds[0];
  const i = activity.memberIds.indexOf(latest.pickedById);
  return activity.memberIds[(i + 1) % activity.memberIds.length];
}

/** Whole days between two ISO dates, sign-free; parsed as UTC so DST
    can't produce a 23-hour "day". */
function daysApart(a: string, b: string): number {
  const ms = Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`));
  return Math.round(ms / 86_400_000);
}

/**
 * The existing event that a new one dated `date` is probably a repeat of:
 * the nearest event within `windowDays` either side, newest winning a
 * tie; `undefined` when nothing is that close. `events` must already be
 * scoped to one activity. Three days catches "logged Sunday's breakfast
 * again on Monday" while consecutive weekly outings (7 days apart) never
 * collide (#66).
 */
export function duplicateCandidate<
  T extends { id: string; date: string; createdAt?: Date },
>(events: T[], date: string, windowDays = 3): T | undefined {
  let best: T | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const event of newestFirst(events)) {
    const distance = daysApart(event.date, date);
    if (distance <= windowDays && distance < bestDistance) {
      best = event;
      bestDistance = distance;
    }
  }
  return best;
}

/** Mean of rated reviews (stars > 0); 0 when nobody has rated yet. */
export function eventAverage(reviews: { stars: number }[]): number {
  const rated = reviews.map((r) => r.stars).filter((s) => s > 0);
  return rated.length
    ? rated.reduce((sum, s) => sum + s, 0) / rated.length
    : 0;
}

/**
 * Mean of a place's per-event averages. Every visit counts toward the
 * denominator — an entirely unrated visit contributes 0, matching the
 * prototype. One array of reviews per event at that place.
 */
export function placeAverage(reviewsPerEvent: { stars: number }[][]): number {
  if (!reviewsPerEvent.length) return 0;
  const total = reviewsPerEvent.reduce(
    (sum, reviews) => sum + eventAverage(reviews),
    0,
  );
  return total / reviewsPerEvent.length;
}

/** "★★★★☆" — rounded to the nearest whole star. */
export function starString(avg: number): string {
  const r = Math.round(avg);
  return "★".repeat(r) + "☆".repeat(5 - r);
}

/**
 * Distinct place names for the log form's autocomplete: newest first,
 * case-insensitive substring match (empty query matches everything —
 * suggestions show before typing), capped at 4. `events` must already be
 * scoped to one activity.
 */
export function placeSuggestions(
  events: SuggestionEvent[],
  query: string,
): string[] {
  const q = query.trim().toLowerCase();
  const seen: string[] = [];
  for (const event of newestFirst(events)) {
    if (!seen.includes(event.placeName)) seen.push(event.placeName);
  }
  return seen.filter((name) => !q || name.toLowerCase().includes(q)).slice(0, 4);
}
