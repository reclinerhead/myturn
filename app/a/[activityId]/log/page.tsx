import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { activities, events, people, places, reviews } from "@/db/schema";
import { getSessionPerson } from "@/lib/auth";
import { nextUp, placeAverage, starString } from "@/lib/derived";
import { LogForm } from "./log-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/a/[activityId]/log">) {
  const { activityId } = await params;
  const activity = db
    .select({ kind: activities.kind })
    .from(activities)
    .where(eq(activities.id, activityId))
    .get();
  if (!activity) return { title: "myturn" };
  return {
    title: `${activity.kind === "food" ? "Log breakfast" : "Log the walk"} · myturn`,
  };
}

export default async function LogEvent({
  params,
}: PageProps<"/a/[activityId]/log">) {
  if (!(await getSessionPerson())) redirect("/login");

  const { activityId } = await params;
  const activity = db
    .select()
    .from(activities)
    .where(eq(activities.id, activityId))
    .get();
  if (!activity) notFound();

  const allPeople = db.select().from(people).all();
  const personById = new Map(allPeople.map((p) => [p.id, p]));
  const members = activity.memberIds
    .map((id) => personById.get(id))
    .filter((p) => p !== undefined);

  const actEvents = db
    .select({
      id: events.id,
      date: events.date,
      pickedById: events.pickedById,
      createdAt: events.createdAt,
      placeName: places.name,
    })
    .from(events)
    .innerJoin(places, eq(events.placeId, places.id))
    .where(eq(events.activityId, activity.id))
    .all();
  const actReviews = actEvents.length
    ? db
        .select({ eventId: reviews.eventId, stars: reviews.stars })
        .from(reviews)
        .where(
          inArray(
            reviews.eventId,
            actEvents.map((e) => e.id),
          ),
        )
        .all()
    : [];

  /* Star string + visit count per distinct place, for the suggestion
     rows ("★★★★☆  2×"). */
  const placeMeta: Record<string, { stars: string; count: number }> = {};
  for (const event of actEvents) {
    if (placeMeta[event.placeName]) continue;
    const placeEvents = actEvents.filter(
      (e) => e.placeName === event.placeName,
    );
    placeMeta[event.placeName] = {
      stars: starString(
        placeAverage(
          placeEvents.map((e) =>
            actReviews.filter((r) => r.eventId === e.id),
          ),
        ),
      ),
      count: placeEvents.length,
    };
  }

  return (
    <main className="mt-rise flex-1 pb-[30px] pt-[2px]">
      <div className="-mx-1 flex items-center py-[2px]">
        <Link
          href={`/a/${activity.id}`}
          className="btn btn-ghost min-h-12 text-[17px]"
        >
          ← {activity.name}
        </Link>
      </div>
      <h1 className="mb-5 text-[32px]">
        {activity.kind === "food" ? "Log breakfast" : "Log the walk"}
      </h1>
      <LogForm
        activity={{ id: activity.id, kind: activity.kind }}
        members={members}
        nextUpId={nextUp(activity, actEvents)}
        suggestionEvents={actEvents.map(({ id, date, placeName, createdAt }) => ({
          id,
          date,
          placeName,
          createdAt,
        }))}
        placeMeta={placeMeta}
        defaultDate={new Date().toLocaleDateString("en-CA")}
      />
    </main>
  );
}
