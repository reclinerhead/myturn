import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { Calendar, Coffee, Footprints } from "lucide-react";
import { db } from "@/db";
import { activities, events, people, places, reviews } from "@/db/schema";
import { getSessionPerson } from "@/lib/auth";
import { eventAverage, newestFirst, nextUp, starString } from "@/lib/derived";
import { shortDate } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/a/[activityId]">) {
  const { activityId } = await params;
  const activity = await db
    .select({ name: activities.name })
    .from(activities)
    .where(eq(activities.id, activityId))
    .get();
  return { title: activity ? `${activity.name} · MyTurn` : "MyTurn" };
}

export default async function ActivityDetail({
  params,
}: PageProps<"/a/[activityId]">) {
  if (!(await getSessionPerson())) redirect("/login");

  const { activityId } = await params;
  const activity = await db
    .select()
    .from(activities)
    .where(eq(activities.id, activityId))
    .get();
  if (!activity) notFound();

  const allPeople = await db.select().from(people);
  const personById = new Map(allPeople.map((p) => [p.id, p]));
  const actEvents = await db
    .select({
      id: events.id,
      date: events.date,
      pickedById: events.pickedById,
      createdAt: events.createdAt,
      placeName: places.name,
    })
    .from(events)
    .innerJoin(places, eq(events.placeId, places.id))
    .where(eq(events.activityId, activity.id));
  const actReviews = actEvents.length
    ? await db
        .select()
        .from(reviews)
        .where(
          inArray(
            reviews.eventId,
            actEvents.map((e) => e.id),
          ),
        )
    : [];

  const next = personById.get(nextUp(activity, actEvents))!;
  const history = newestFirst(actEvents);
  const food = activity.kind === "food";
  const noun = food ? "breakfast" : "walk";

  return (
    <main className="mt-rise pb-[26px] pt-[2px]">
      <div className="-mx-1 flex items-center py-[2px]">
        <Link href="/" className="btn btn-ghost min-h-12 text-[17px]">
          ← Home
        </Link>
      </div>

      {/* 30px h1 / 24px icon / 8px gap are load-bearing — 34px wraps
          "Sunday Breakfast" at 390px (spec). */}
      <h1 className="mb-1 flex items-center gap-2 text-[30px]">
        <Icon
          icon={food ? Coffee : Footprints}
          size={24}
          className="flex-none text-accent-700"
        />
        {activity.name}
      </h1>
      <p className="mb-[18px] text-[15px] text-text/62">
        {activity.cadenceLabel}
      </p>

      <div
        className="mb-[18px] rounded-lg p-[22px] text-person-ink shadow-md"
        style={{ background: next.color }}
      >
        <div className="flex items-center gap-4">
          <div className="flex-none rounded-full bg-person-ink/22 ring-[3px] ring-person-ink/50">
            <Avatar person={next} size={84} />
          </div>
          <div>
            <div className="text-[14px] font-bold uppercase tracking-[.12em] opacity-70">
              Next up
            </div>
            <div className="font-heading text-[44px] leading-none">
              {next.name}
            </div>
          </div>
        </div>
        <p className="mb-0 mt-[14px] text-[16px] opacity-80">
          {food
            ? "Pick a spot, text the group, act natural."
            : "Your trail, your pace."}
        </p>
      </div>

      <Link
        href={`/a/${activity.id}/log`}
        className="btn btn-primary btn-block mb-[26px] mt-[6px] min-h-[58px] text-[19px]"
      >
        {food ? "Log this Sunday" : "Log today's walk"}
      </Link>

      {history.length > 0 ? (
        <>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-[22px]">The record</h2>
            <span className="text-[14px] opacity-55">
              {history.length} {history.length === 1 ? noun : `${noun}s`}
            </span>
          </div>
          {history.map((event) => {
            const picker = personById.get(event.pickedById);
            const eventReviews = actReviews.filter(
              (r) => r.eventId === event.id,
            );
            const rated = eventReviews.filter((r) => r.stars > 0).length;
            return (
              <Link
                key={event.id}
                href={`/e/${event.id}`}
                className="flex items-center gap-[13px] border-b border-divider px-1 py-[14px] text-inherit no-underline"
              >
                {picker && <Avatar person={picker} size={40} />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[17px] font-semibold">
                    {event.placeName}
                  </div>
                  <div className="text-[14px] text-text/60">
                    {shortDate(event.date)} · {picker?.name ?? "Someone"}{" "}
                    picked
                  </div>
                </div>
                <div className="flex-none text-right">
                  <div className="text-[15px] tracking-[1.5px] text-accent-700">
                    {starString(eventAverage(eventReviews))}
                  </div>
                  <div className="text-[12px] opacity-50">
                    {rated} of {activity.memberIds.length}
                  </div>
                </div>
              </Link>
            );
          })}
        </>
      ) : (
        <div className="rounded-lg bg-surface px-[18px] py-9 text-center">
          <div className="mb-3 flex justify-center text-accent-700">
            <Icon icon={Calendar} size={46} />
          </div>
          <h3 className="mb-[6px] text-[22px]">Nothing logged yet</h3>
          <p className="mb-0 text-[16px] text-text/65">
            Go somewhere, then come back and tell on yourselves.
          </p>
        </div>
      )}
    </main>
  );
}
