import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Coffee, Footprints } from "lucide-react";
import { db } from "@/db";
import { getSessionPerson } from "@/lib/auth";
import { activities, events, people, places, reviews } from "@/db/schema";
import { eventAverage, latestEvent, nextUp, starString } from "@/lib/derived";
import { shortDate } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { SettingsMenu } from "@/components/settings-menu";

/* Reads the DB per request; never prerendered (the build machine has no
   database). */
export const dynamic = "force-dynamic";

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five"];

function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function Home() {
  const me = await getSessionPerson();
  if (!me) redirect("/login");

  const allPeople = await db.select().from(people);
  const personById = new Map(allPeople.map((p) => [p.id, p]));
  const acts = await db.select().from(activities);
  const allEvents = await db
    .select({
      id: events.id,
      activityId: events.activityId,
      date: events.date,
      pickedById: events.pickedById,
      createdAt: events.createdAt,
      placeName: places.name,
    })
    .from(events)
    .innerJoin(places, eq(events.placeId, places.id));
  const allReviews = await db.select().from(reviews);

  const count = acts.length;

  const cards = acts.map((activity) => {
    const actEvents = allEvents.filter((e) => e.activityId === activity.id);
    const next = personById.get(nextUp(activity, actEvents))!;
    const last = latestEvent(actEvents);
    return {
      activity,
      next,
      last,
      lastStars: last
        ? starString(
            eventAverage(allReviews.filter((r) => r.eventId === last.id)),
          )
        : null,
    };
  });

  return (
    <main className="mt-rise flex-1 pb-[34px] pt-2">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-[2px] text-[40px] leading-none">myturn</h1>
          <p className="text-[16px] text-text/65">
            Hi {me.name}. {capitalize(numberWord(count))}{" "}
            {count === 1 ? "rotation" : "rotations"}, zero arguments.
          </p>
        </div>
        <SettingsMenu me={me} />
      </div>

      <div className="mt-5">
      {cards.map(({ activity, next, last, lastStars }) => (
        <Link
          key={activity.id}
          href={`/a/${activity.id}`}
          className="mb-4 block overflow-hidden rounded-lg bg-surface text-inherit no-underline shadow-sm"
        >
          <div className="flex items-stretch">
            <div className="w-3 flex-none" style={{ background: next.color }} />
            <div className="min-w-0 flex-1 p-5 pb-[18px]">
              <div className="mb-3 flex items-center gap-[9px] text-accent-700">
                <Icon
                  icon={activity.kind === "food" ? Coffee : Footprints}
                  size={24}
                />
                <span className="font-heading text-[21px] text-text">
                  {activity.name}
                </span>
              </div>
              <div className="mb-[14px] flex items-center gap-3">
                <Avatar person={next} size={54} />
                <div className="min-w-0">
                  <div className="text-[13px] font-bold uppercase tracking-[.1em] opacity-55">
                    Next up
                  </div>
                  <div className="font-heading text-[32px] leading-[1.05]">
                    {next.name}
                  </div>
                </div>
              </div>
              <div className="text-[15px] leading-[1.4] text-text/68">
                Last time: {last ? last.placeName : "Nothing yet"}
                {last && (
                  <>
                    <br />
                    <span className="text-[17px] tracking-[2px] text-accent-700">
                      {lastStars}
                    </span>{" "}
                    <span className="text-[14px]">{shortDate(last.date)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
      </div>

      <p className="mb-0 mt-[22px] text-center text-[14px] text-text/50">
        {capitalize(numberWord(count))} {count === 1 ? "thing" : "things"}.
        That&apos;s plenty.
      </p>
    </main>
  );
}
