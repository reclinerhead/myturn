"use client";

import { useState } from "react";

export const STAR_CAPTIONS = [
  "Tap a star",
  "Never again",
  "It was fine",
  "Pretty good",
  "Great",
  "Perfect, no notes",
];

/* The jumbo star input (spec, Screen 6) — 46px glyphs with ~54px tap
   targets via padding. Interactive when onChange is set (writes happen
   immediately, no save button); read-only rendering at the same size
   otherwise. Tapping replays mtPop on the filled run, like the
   prototype. */
export function StarRating({
  value,
  onChange,
  caption,
}: {
  value: number;
  onChange?: (stars: number) => void;
  caption?: string;
}) {
  const [popKey, setPopKey] = useState(0);
  const interactive = Boolean(onChange);

  return (
    <div>
      <div
        className="flex items-center gap-1"
        role={interactive ? undefined : "img"}
        aria-label={interactive ? undefined : `${value} of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const on = value >= n;
          const glyph = (
            <span
              key={on ? `on-${n}-${popKey}` : `off-${n}`}
              className={`block text-[46px] leading-none ${
                on ? "text-accent" : "opacity-[.28]"
              } ${on && interactive && popKey > 0 ? "mt-pop" : ""}`}
            >
              {on ? "★" : "☆"}
            </span>
          );
          return interactive ? (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              className="cursor-pointer select-none px-[3px] py-1"
              onClick={() => {
                setPopKey((k) => k + 1);
                onChange!(n);
              }}
            >
              {glyph}
            </button>
          ) : (
            <span key={n} aria-hidden className="px-[3px] py-1">
              {glyph}
            </span>
          );
        })}
      </div>
      {caption !== undefined && (
        <div className="mt-[6px] text-[15px] opacity-60">{caption}</div>
      )}
    </div>
  );
}
