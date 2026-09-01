"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { STAR_CAPTIONS, StarRating } from "@/components/star-rating";
import { updateMyReview, type ReviewPatch } from "./actions";

type TextField = "comment" | "had" | "distanceMiles" | "minutes";

/* The signed-in person's card: stars write immediately (then refresh, so
   the waiting line updates); text fields debounce 500ms and flush on
   blur. Optimistic — local state is the truth while typing. */
export function MyReviewCard({
  eventId,
  kind,
  person,
  initial,
}: {
  eventId: string;
  kind: "food" | "trail";
  person: {
    name: string;
    monogram: string;
    color: string;
    photoUrl: string | null;
  };
  initial: {
    stars: number;
    omeletteQuality: number | null;
    comment: string | null;
    had: string | null;
    distanceMiles: number | null;
    minutes: number | null;
  };
}) {
  const router = useRouter();
  const [stars, setStars] = useState(initial.stars);
  const [omelette, setOmelette] = useState(initial.omeletteQuality);
  const [text, setText] = useState<Record<TextField, string>>({
    comment: initial.comment ?? "",
    had: initial.had ?? "",
    distanceMiles: initial.distanceMiles?.toString() ?? "",
    minutes: initial.minutes?.toString() ?? "",
  });
  const timers = useRef<Partial<Record<TextField, ReturnType<typeof setTimeout>>>>({});

  useEffect(() => {
    const pending = timers.current;
    return () => Object.values(pending).forEach(clearTimeout);
  }, []);

  function rate(n: number) {
    setStars(n);
    void updateMyReview(eventId, { stars: n }).then(() => router.refresh());
  }

  function rateOmelette(n: number) {
    setOmelette(n);
    void updateMyReview(eventId, { omeletteQuality: n });
  }

  function editText(field: TextField, value: string) {
    setText((t) => ({ ...t, [field]: value }));
    clearTimeout(timers.current[field]);
    timers.current[field] = setTimeout(() => flush(field, value), 500);
  }

  function flush(field: TextField, value: string) {
    clearTimeout(timers.current[field]);
    void updateMyReview(eventId, { [field]: value } as ReviewPatch);
  }

  const inputClass =
    "input mt-[10px] min-h-[52px] px-4 py-3 text-[17px]";

  return (
    <div className="mb-[14px] rounded-lg border-2 border-accent bg-accent-100 p-[18px] text-accent-900">
      <div className="mb-3 flex items-center gap-[11px]">
        <Avatar person={person} size={44} />
        <div className="flex-1">
          <div className="font-heading text-[20px]">{person.name}</div>
          <div className="text-[13px] opacity-55">Your review</div>
        </div>
      </div>
      <StarRating value={stars} onChange={rate} caption={STAR_CAPTIONS[stars]} />
      {kind === "food" && (
        <div className="mt-[14px]">
          <div className="text-[15px] font-semibold">Omelette Quality</div>
          <div className="mt-1">
            <StarRating value={omelette ?? 0} onChange={rateOmelette} />
          </div>
        </div>
      )}
      <input
        className={`${inputClass} mt-[14px]`}
        placeholder="A word about it (optional)"
        value={text.comment}
        onChange={(e) => editText("comment", e.target.value)}
        onBlur={(e) => flush("comment", e.target.value)}
      />
      {kind === "food" && (
        <input
          className={inputClass}
          placeholder="What I had (optional)"
          value={text.had}
          onChange={(e) => editText("had", e.target.value)}
          onBlur={(e) => flush("had", e.target.value)}
        />
      )}
      {kind === "trail" && (
        <div className="mt-[10px] flex gap-[10px]">
          <input
            className="input min-h-[52px] px-4 py-3 text-[17px]"
            inputMode="decimal"
            placeholder="Miles (opt.)"
            value={text.distanceMiles}
            onChange={(e) => editText("distanceMiles", e.target.value)}
            onBlur={(e) => flush("distanceMiles", e.target.value)}
          />
          <input
            className="input min-h-[52px] px-4 py-3 text-[17px]"
            inputMode="numeric"
            placeholder="Minutes (opt.)"
            value={text.minutes}
            onChange={(e) => editText("minutes", e.target.value)}
            onBlur={(e) => flush("minutes", e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
