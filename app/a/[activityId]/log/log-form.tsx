"use client";

import { useState, useTransition } from "react";
import { placeSuggestions, type SuggestionEvent } from "@/lib/derived";
import { Avatar } from "@/components/avatar";
import { createEvent } from "./actions";

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
   is a non-empty place. */
export function LogForm({
  activity,
  members,
  nextUpId,
  suggestionEvents,
  placeMeta,
  defaultDate,
}: {
  activity: { id: string; kind: "food" | "trail" };
  members: Member[];
  nextUpId: string;
  suggestionEvents: SuggestionEvent[];
  placeMeta: Record<string, { stars: string; count: number }>;
  defaultDate: string;
}) {
  const [place, setPlace] = useState("");
  const [pickedById, setPickedById] = useState(nextUpId);
  const [date, setDate] = useState(defaultDate);
  const [pending, startTransition] = useTransition();

  const food = activity.kind === "food";
  const suggestions = placeSuggestions(suggestionEvents, place);
  const query = place.trim();
  const knownNames = Object.keys(placeMeta);
  const showCreate =
    query.length > 1 &&
    !knownNames.some((n) => n.toLowerCase() === query.toLowerCase());

  function save() {
    startTransition(async () => {
      await createEvent(activity.id, { placeName: place, pickedById, date });
    });
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
