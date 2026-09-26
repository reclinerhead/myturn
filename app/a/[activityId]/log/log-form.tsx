"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { duplicateCandidate, placeSuggestions } from "@/lib/derived";
import { longDate } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import { createEvent, type LoggedEvent } from "./actions";

type Member = {
  id: string;
  name: string;
  monogram: string;
  color: string;
  photoUrl: string | null;
};

/* One screen, minimal typing (spec Screen 5): recent places suggest
   before any keystroke, an exact-match miss offers inline creation, the
   picker chips pre-select the derived next-up, and the only validation
   is a non-empty place.

   Duplicate guard (#66): when an event already sits within a few days of
   the chosen date, the form steps aside and points at it — the picker
   pre-fill otherwise turns "logged Sunday again on Monday" into a stolen
   turn. "This was a different …" reveals the form and arms the override
   the server action requires. */
export function LogForm({
  activity,
  members,
  nextUpId,
  activityEvents,
  placeMeta,
  defaultDate,
}: {
  activity: { id: string; kind: "food" | "trail" };
  members: Member[];
  nextUpId: string;
  activityEvents: LoggedEvent[];
  placeMeta: Record<string, { stars: string; count: number }>;
  defaultDate: string;
}) {
  const [place, setPlace] = useState("");
  const [pickedById, setPickedById] = useState(nextUpId);
  const [date, setDate] = useState(defaultDate);
  const [differentOuting, setDifferentOuting] = useState(false);
  /* Events the server told us about on a refused save — someone logged
     after this form loaded, the exact race behind the incident. */
  const [learned, setLearned] = useState<LoggedEvent[]>([]);
  const [pending, startTransition] = useTransition();

  const food = activity.kind === "food";
  const noun = food ? "breakfast" : "walk";
  const known = [
    ...learned.filter((l) => !activityEvents.some((e) => e.id === l.id)),
    ...activityEvents,
  ];
  const candidate = duplicateCandidate(known, date);
  const blocked = candidate !== undefined && !differentOuting;
  const candidatePicker =
    candidate && members.find((m) => m.id === candidate.pickedById);
  const candidatePickerName = candidatePicker?.name ?? "Someone";

  const suggestions = placeSuggestions(activityEvents, place);
  const query = place.trim();
  const knownNames = Object.keys(placeMeta);
  const showCreate =
    query.length > 1 &&
    !knownNames.some((n) => n.toLowerCase() === query.toLowerCase());

  function save() {
    startTransition(async () => {
      const result = await createEvent(activity.id, {
        placeName: place,
        pickedById,
        date,
        allowDuplicate: differentOuting,
      });
      if (result?.duplicate) {
        setLearned((prev) => [...prev, result.duplicate]);
        setDifferentOuting(false);
      }
    });
  }

  if (blocked) {
    return (
      <>
        <div className="rounded-lg border border-divider bg-surface p-[18px]">
          <div className="mb-3 flex items-center gap-[11px]">
            {candidatePicker && <Avatar person={candidatePicker} size={44} />}
            <div className="min-w-0 flex-1">
              <div className="font-heading text-[20px] leading-[1.2]">
                {candidatePickerName} already logged {candidate.placeName}
              </div>
              <div className="text-[14px] text-text/60">
                {longDate(candidate.date)} · {candidatePickerName} picked
              </div>
            </div>
          </div>
          <p className="mb-0 text-[16px] leading-[1.45]">
            Sounds like the same {noun}. Rate that one instead of logging it
            twice.
          </p>
          <Link
            href={`/e/${candidate.id}`}
            className="btn btn-primary btn-block mt-4 min-h-[58px] text-[19px]"
          >
            Rate that one
          </Link>
        </div>
        <button
          type="button"
          className="btn btn-ghost mt-3 min-h-12 w-full text-[16px]"
          onClick={() => setDifferentOuting(true)}
        >
          Actually, this was a different {noun}
        </button>
      </>
    );
  }

  return (
    <>
      <div className="field mb-2">
        <label htmlFor="place" className="text-[15px] font-semibold">
          {food ? "Where did you eat?" : "Which trail?"}
        </label>
        <input
          id="place"
          className="input min-h-[56px] rounded-md px-[18px] py-3 text-[18px]"
          placeholder={food ? "Diner, cafe, that one place…" : "Trail, park, loop…"}
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          autoComplete="off"
        />
      </div>
      {suggestions.map((name) => (
        <button
          key={name}
          type="button"
          className="flex w-full cursor-pointer items-center justify-between gap-[10px] border-b border-divider px-4 py-[13px] text-left"
          onClick={() => setPlace(name)}
        >
          <span className="text-[17px]">{name}</span>
          <span className="text-[14px] opacity-55">
            {placeMeta[name].stars}&ensp;{placeMeta[name].count}×
          </span>
        </button>
      ))}
      {showCreate && (
        <button
          type="button"
          className="w-full cursor-pointer px-4 py-[13px] text-left text-[17px] font-semibold text-accent-700"
          onClick={() => setPlace(query)}
        >
          ＋ Add &ldquo;{query}&rdquo; as a new spot
        </button>
      )}

      <div className="mb-2 mt-[26px] text-[15px] font-semibold">Who picked?</div>
      <div className="flex flex-wrap gap-[10px]">
        {members.map((member) => {
          const on = pickedById === member.id;
          return (
            <button
              key={member.id}
              type="button"
              className="flex min-h-[56px] cursor-pointer items-center gap-[9px] rounded-full border-2 py-[10px] pl-[10px] pr-[18px] text-[18px] font-semibold"
              style={{
                borderColor: on ? member.color : "var(--color-divider)",
                background: on ? `${member.color}22` : "transparent",
              }}
              onClick={() => setPickedById(member.id)}
            >
              <Avatar person={member} size={38} />
              {member.name}
            </button>
          );
        })}
      </div>
      <p className="mx-[2px] mb-0 mt-[10px] text-[14px] text-text/58">
        {pickedById === nextUpId
          ? "Pre-filled with whoever's turn it was. Change it if you swapped."
          : "Swapped — the rotation will pick up from here."}
      </p>

      <div className="field mt-6">
        <label htmlFor="date" className="text-[15px] font-semibold">
          When
        </label>
        <input
          id="date"
          type="date"
          className="input min-h-[56px] rounded-md px-[18px] py-3 text-[18px]"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      {candidate && (
        <p className="mx-[2px] mb-0 mt-[10px] text-[14px] text-text/58">
          Logging this alongside {candidatePickerName}&rsquo;s{" "}
          {candidate.placeName} on {longDate(candidate.date)}.
        </p>
      )}

      <button
        type="button"
        className="btn btn-primary btn-block mt-[30px] min-h-[58px] text-[19px]"
        disabled={!query || pending}
        onClick={save}
      >
        {pending ? "Saving…" : food ? "Save breakfast" : "Save walk"}
      </button>
    </>
  );
}
