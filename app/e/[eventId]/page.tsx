import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { CheckCircle } from "lucide-react";
import { db } from "@/db";
import { activities, events, people, places, reviews } from "@/db/schema";
import { getSessionPerson } from "@/lib/auth";
import { longDate } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { StarRating } from "@/components/star-rating";
import { MyReviewCard } from "./my-review-card";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/e/[eventId]">) {
  const { eventId } = await params;
  const row = db
    .select({ name: places.name })
    .from(events)
    .innerJoin(places, eq(events.placeId, places.id))
    .where(eq(events.id, eventId))
    .get();
  return { title: row ? `${row.name} · myturn` : "myturn" };
}

export default async function EventDetail({
  params,
  searchParams,
}: PageProps<"/e/[eventId]">) {
  const me = await getSessionPerson();
  if (!me) redirect("/login");

  const { eventId } = await params;
  const { saved } = await searchParams;

  const event = db
    .select({
      id: events.id,
      activityId: events.activityId,
      date: events.date,
      pickedById: events.pickedById,
      placeId: places.id,
      placeName: places.name,
    })
    .from(events)
    .innerJoin(places, eq(events.placeId, places.id))
    .where(eq(events.id, eventId))
    .get();
  if (!event) notFound();

  const activity = db
    .select()
    .from(activities)
    .where(eq(activities.id, event.activityId))
    .get();
  if (!activity) notFound();

  const allPeople = db.select().from(people).all();
  const personById = new Map(allPeople.map((p) => [p.id, p]));
  const eventReviews = db
    .select()
    .from(reviews)
    .where(eq(reviews.eventId, event.id))
    .all();
  const reviewByPerson = new Map(eventReviews.map((r) => [r.personId, r]));

  const picker = personById.get(event.pickedById);
  const unrated = activity.memberIds
    .filter((id) => (reviewByPerson.get(id)?.stars ?? 0) === 0)
    .map((id) => personById.get(id)?.name ?? "Someone");
  const waiting =
    unrated.length === 0
      ? "Everyone has weighed in. Democracy."
      : unrated.length === activity.memberIds.length
        ? "Nobody has rated yet. Someone go first."
        : `Still waiting on ${
            unrated.length === 1
              ? unrated[0]
              : `${unrated.slice(0, -1).join(", ")} and ${unrated[unrated.length - 1]}`
          }.`;

  return (
    <main className="mt-rise flex-1 pb-[34px] pt-[2px]">
      <div className="-mx-1 flex items-center py-[2px]">
        <Link
          href={`/a/${activity.id}`}
          className="btn btn-ghost min-h-12 text-[17px]"
        >
          ← Back
        </Link>
      </div>

      {saved === "1" && (
        <div className="mb-4 flex items-center gap-[10px] rounded-md bg-accent-2-200 px-4 py-[13px] text-[16px] text-accent-2-900">
          <Icon icon={CheckCircle} size={22} className="flex-none" />
          <span>Logged. Now the fun part — rate it.</span>
        </div>
      )}

      <h1 className="mb-1 text-[32px]">{event.placeName}</h1>
      <div className="mb-[6px] flex items-center gap-[9px] text-[16px] text-text/70">
        <span>{longDate(event.date)}</span>
        <span>·</span>
        {picker && <Avatar person={picker} size={26} />}
        <span>{picker?.name ?? "Someone"} picked</span>
      </div>
      <Link
        href={`/p/${event.placeId}`}
        className="mb-5 block text-[16px] font-semibold text-accent-700 no-underline"
      >
        All visits to {event.placeName} →
      </Link>

      {activity.memberIds.map((memberId) => {
        const person = personById.get(memberId);
        if (!person) return null;
        const review = reviewByPerson.get(memberId);
        const rated = (review?.stars ?? 0) > 0;

        if (memberId === me.id) {
          return (
            <MyReviewCard
              key={memberId}
              eventId={event.id}
              kind={activity.kind}
              person={person}
              initial={{
                stars: review?.stars ?? 0,
                omeletteQuality: review?.omeletteQuality ?? null,
                comment: review?.comment ?? null,
                had: review?.had ?? null,
                distanceMiles: review?.distanceMiles ?? null,
                minutes: review?.minutes ?? null,
              }}
            />
          );
        }

        return (
          <div
            key={memberId}
            className="mb-[14px] rounded-lg border border-divider bg-surface p-[18px]"
          >
            <div className="mb-3 flex items-center gap-[11px]">
              <Avatar person={person} size={44} />
              <div className="flex-1">
                <div className="font-heading text-[20px]">{person.name}</div>
                <div className="text-[13px] opacity-55">
                  {rated ? (person.role ?? "") : "Hasn't rated yet"}
                </div>
              </div>
            </div>
            <StarRating value={review?.stars ?? 0} />
            {activity.kind === "food" && review?.omeletteQuality != null && (
              <div className="mt-[10px]">
                <div className="text-[13px] opacity-55">Omelette Quality</div>
                <StarRating value={review.omeletteQuality} />
              </div>
            )}
            <div className="mt-[10px] text-[17px] leading-[1.45]">
              {rated ? (review?.comment ?? "(no comment)") : "Nudge them."}
            </div>
          </div>
        );
      })}

      <p className="mb-0 mt-[18px] text-center text-[15px] text-text/58">
        {waiting}
      </p>
      <Link
        href={`/a/${activity.id}`}
        className="btn btn-primary btn-block mt-5 min-h-[58px] text-[19px]"
      >
        Done
      </Link>
    </main>
  );
}
