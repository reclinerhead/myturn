import { describe, expect, it } from "vitest";
import {
  eventAverage,
  latestEvent,
  nextUp,
  placeAverage,
  placeSuggestions,
  starString,
  type RotationEvent,
  type SuggestionEvent,
} from "./derived";

/* Fixtures mirror the seed data (prototype logic class): 4 breakfasts,
   3 walks. Only the fields the helpers read. */

const breakfast = { memberIds: ["karen", "chad", "kathy"] };
const walking = { memberIds: ["karen", "kathy"] };

const breakfastEvents: RotationEvent[] = [
  { id: "b4", date: "2026-08-23", pickedById: "kathy" },
  { id: "b3", date: "2026-08-16", pickedById: "chad" },
  { id: "b2", date: "2026-08-09", pickedById: "karen" },
  { id: "b1", date: "2026-08-02", pickedById: "kathy" },
];

const walkingEvents: RotationEvent[] = [
  { id: "w3", date: "2026-08-21", pickedById: "karen" },
  { id: "w2", date: "2026-08-14", pickedById: "kathy" },
  { id: "w1", date: "2026-08-07", pickedById: "karen" },
];

describe("nextUp", () => {
  it("returns Karen for breakfast on the seed data", () => {
    expect(nextUp(breakfast, breakfastEvents)).toBe("karen");
  });

  it("returns Kathy for walking on the seed data", () => {
    expect(nextUp(walking, walkingEvents)).toBe("kathy");
  });

  it("returns the first member when there is no history", () => {
    expect(nextUp(breakfast, [])).toBe("karen");
  });

  it("wraps from the last member back to the first", () => {
    expect(
      nextUp(breakfast, [{ id: "e1", date: "2026-08-23", pickedById: "kathy" }]),
    ).toBe("karen");
  });

  it("re-bases the rotation after a manual picker swap", () => {
    // Kathy was next (after Chad), but Karen logs herself as picker instead.
    const swapped: RotationEvent[] = [
      { id: "b5", date: "2026-08-30", pickedById: "karen" },
      ...breakfastEvents,
    ];
    expect(nextUp(breakfast, swapped)).toBe("chad");
  });

  it("is not confused by backfilled out-of-order rows", () => {
    // Same events, array order scrambled — date ordering must win.
    const scrambled = [
      breakfastEvents[2],
      breakfastEvents[0],
      breakfastEvents[3],
      breakfastEvents[1],
    ];
    expect(nextUp(breakfast, scrambled)).toBe("karen");
  });

  it("breaks same-date ties by insertion time", () => {
    const sameDay: RotationEvent[] = [
      {
        id: "a",
        date: "2026-08-23",
        pickedById: "karen",
        createdAt: new Date("2026-08-23T10:00:00Z"),
      },
      {
        id: "b",
        date: "2026-08-23",
        pickedById: "chad",
        createdAt: new Date("2026-08-23T14:00:00Z"),
      },
    ];
    // Chad's row was logged later, so it is the latest → Kathy is next.
    expect(nextUp(breakfast, sameDay)).toBe("kathy");
  });

  it("falls back to the first member when the latest picker left the rotation", () => {
    expect(
      nextUp(walking, [{ id: "e1", date: "2026-08-23", pickedById: "chad" }]),
    ).toBe("karen");
  });
});

describe("latestEvent", () => {
  it("picks by date regardless of array order", () => {
    const scrambled = [breakfastEvents[2], breakfastEvents[0], breakfastEvents[3]];
    expect(latestEvent(scrambled)?.id).toBe("b4");
  });

  it("returns undefined for no events", () => {
    expect(latestEvent([])).toBeUndefined();
  });
});

describe("eventAverage", () => {
  it("averages rated reviews", () => {
    // Seed b4: 4, 3, 5.
    expect(eventAverage([{ stars: 4 }, { stars: 3 }, { stars: 5 }])).toBe(4);
  });

  it("excludes unrated (stars 0) reviews", () => {
    // Seed w2: Karen 3, Kathy 4 rated; a 0 must not drag the mean.
    expect(eventAverage([{ stars: 3 }, { stars: 4 }, { stars: 0 }])).toBe(3.5);
  });

  it("returns 0 when nobody has rated", () => {
    expect(eventAverage([{ stars: 0 }, { stars: 0 }])).toBe(0);
    expect(eventAverage([])).toBe(0);
  });
});

describe("placeAverage", () => {
  it("averages the per-event averages", () => {
    // Seed Cracker Barrel: b4 avg 4, b1 avg 4 → 4.
    expect(
      placeAverage([
        [{ stars: 4 }, { stars: 3 }, { stars: 5 }],
        [{ stars: 4 }, { stars: 4 }, { stars: 4 }],
      ]),
    ).toBe(4);
  });

  it("counts an entirely unrated visit as 0, per the prototype", () => {
    expect(placeAverage([[{ stars: 4 }], [{ stars: 0 }]])).toBe(2);
  });

  it("returns 0 with no visits", () => {
    expect(placeAverage([])).toBe(0);
  });
});

describe("starString", () => {
  it("rounds to the nearest whole star", () => {
    expect(starString(4.4)).toBe("★★★★☆");
    expect(starString(3.5)).toBe("★★★★☆");
    expect(starString(2.4)).toBe("★★☆☆☆");
  });

  it("handles the extremes", () => {
    expect(starString(0)).toBe("☆☆☆☆☆");
    expect(starString(5)).toBe("★★★★★");
  });
});

describe("placeSuggestions", () => {
  const events: SuggestionEvent[] = [
    { id: "b4", date: "2026-08-23", placeName: "Cracker Barrel" },
    { id: "b3", date: "2026-08-16", placeName: "Bob Evans" },
    { id: "b2", date: "2026-08-09", placeName: "The Pancake Shop" },
    { id: "b1", date: "2026-08-02", placeName: "Cracker Barrel" },
  ];

  it("lists distinct places newest first with an empty query", () => {
    expect(placeSuggestions(events, "")).toEqual([
      "Cracker Barrel",
      "Bob Evans",
      "The Pancake Shop",
    ]);
  });

  it("filters by case-insensitive substring", () => {
    expect(placeSuggestions(events, "pAnCaKe")).toEqual(["The Pancake Shop"]);
    expect(placeSuggestions(events, "bar")).toEqual(["Cracker Barrel"]);
  });

  it("returns nothing on a non-matching query", () => {
    expect(placeSuggestions(events, "waffle")).toEqual([]);
  });

  it("caps at 4 suggestions", () => {
    const many: SuggestionEvent[] = Array.from({ length: 6 }, (_, i) => ({
      id: `e${i}`,
      date: `2026-08-0${i + 1}`,
      placeName: `Place ${i}`,
    }));
    expect(placeSuggestions(many, "")).toHaveLength(4);
    // Newest first: Place 5 has the latest date.
    expect(placeSuggestions(many, "")[0]).toBe("Place 5");
  });
});
