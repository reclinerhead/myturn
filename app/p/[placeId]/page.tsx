import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { activities, events, people, places, reviews } from "@/db/schema";
import { getSessionPerson } from "@/lib/auth";
import { newestFirst, placeAverage, starString } from "@/lib/derived";
import { longDate } from "@/lib/format";
import { Avatar } from "@/components/avatar";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/p/[placeId]">) {
  const { placeId } = await params;
  const place = db
    .select({ name: places.name })
    .from(places)
    .where(eq(places.id, placeId))
    .get();
  return { title: place ? `${place.name} · myturn` : "myturn" };
}

/* The "was this one good?" page — read-only, reached from Event Detail's
   "All visits" link. */
export default async function PlaceDetail({
  params,
}: PageProps<"/p/[placeId]">) {
  if (!(await getSessionPerson())) redirect("/login");

  const { placeId } = await params;
  const place = db
    .select()
    .from(places)
    .where(eq(places.id, placeId))
    .get();
  if (!place) notFound();

  const activity = db
    .select()
    .from(activities)
    .where(eq(activities.id, place.activityId))
    .get();
  if (!activity) notFound();

  const allPeople = db.select().from(people).all();
  const personById = new Map(allPeople.map((p) => [p.id, p]));
  const visits = newestFirst(
    db.select().from(events).where(eq(events.placeId, place.id)).all(),
  );
  const visitReviews = visits.length
    ? db
        .select()
        .from(reviews)
        .where(
          inArray(
            reviews.eventId,
            visits.map((v) => v.id),
          ),
        )
        .all()
    : [];

  const avg = placeAverage(
    visits.map((v) => visitReviews.filter((r) => r.eventId === v.id)),
  );

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

      <h1 className="mb-[14px] text-[34px]">{place.name}</h1>

      <div className="mb-[22px] flex gap-3">
        <div className="flex-1 rounded-md bg-surface px-4 py-[14px]">
          <div className="font-heading text-[30px] leading-none">
            {avg ? avg.toFixed(1) : "—"}
          </div>
          <div className="text-[14px] opacity-60">avg rating</div>
        </div>
        <div className="flex-1 rounded-md bg-surface px-4 py-[14px]">
          <div className="font-heading text-[30px] leading-none">
            {visits.length}
          </div>
          <div className="text-[14px] opacity-60">
            {visits.length === 1 ? "visit" : "visits"}
          </div>
        </div>
      </div>

      <div className="mb-[22px] text-[17px] tracking-[3px] text-accent-700">
        {starString(avg)}
      </div>

      {visits.map((visit) => (
        <div key={visit.id} className="border-t border-divider py-4">
          <div className="mb-[10px] flex items-baseline justify-between gap-[10px]">
            <span className="text-[18px] font-bold">
              {longDate(visit.date)}
            </span>
            <span className="text-[14px] opacity-60">
              {personById.get(visit.pickedById)?.name ?? "Someone"} picked
            </span>
          </div>
          {activity.memberIds.map((memberId) => {
            const person = personById.get(memberId);
            if (!person) return null;
            const review = visitReviews.find(
              (r) => r.eventId === visit.id && r.personId === memberId,
            );
            return (
              <div key={memberId} className="mb-2 flex items-start gap-[10px]">
                <Avatar person={person} size={30} />
                <div className="flex-1">
                  <span className="text-[15px] tracking-[1.5px] text-accent-700">
                    {starString(review?.stars ?? 0)}
                  </span>
                  <div className="text-[16px] leading-[1.4]">
                    {review?.comment ?? "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </main>
  );
}
