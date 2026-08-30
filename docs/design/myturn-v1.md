# Handoff: myturn — family rotation tracker (v1)

## Overview
myturn is a private mobile web app for one family (3 people today, more later). It answers three
questions in under 30 seconds, on a phone, at a breakfast table or a trailhead:
**whose turn is it to pick, where did we go last time, and was it any good.**

Two rotations ship in v1 — **Sunday Breakfast** (Karen, Chad, Kathy) and **Friday Walking**
(Karen, Kathy) — but nothing in the design assumes exactly two. The home screen renders a card
per activity from data.

Primary user is Karen (70s, iPhone, reading glasses, not technical). Every design decision below
follows from that: 16px minimum body text, 48px+ tap targets, full-width primary buttons in the
bottom third, full-screen pages instead of modals, no hidden gestures, no passwords.

## About the design files
`myturn.dc.html` in this bundle is a **design reference created in HTML** — a working prototype of
the intended look and behavior, not production code to copy. It runs a small custom template
runtime (`support.js`) that will not exist in your app. Do not port it.

The task is to **recreate these screens in Next.js** (the stated target) using its own conventions:
React components, your router, your data layer. Read the prototype for exact values, copy, and
interaction detail; write idiomatic app code.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, copy, and interactions are final. Recreate them
faithfully. All visual values come from the **Organic** design system (cream/sand ground, terracotta
accent, sage second accent, Caprasimo display over Figtree, over-rounded shapes). Its single
stylesheet is included in this bundle as `styles.css` — port those `:root` custom properties into
the app's global CSS and build against `var(--*)` rather than re-typing hex values.

---

## Data model

The prototype holds everything in one client state object. Suggested server shape:

```ts
Person   { id, name, email, monogram, color, photoUrl? }
Activity { id, name, kind: 'food' | 'trail', memberIds: string[], cadenceLabel }
Place    { id, activityId, name }            // scoped per activity
Event    { id, activityId, placeId, date, pickedById }
Review   { eventId, personId, stars: 0..5, comment?, had?, distanceMiles?, minutes? }
```

Derived, never stored:
- **next up** = `members[(indexOf(latestEvent.pickedById) + 1) % members.length]`; `members[0]` when
  there is no history. Because it derives from the last event's picker, a manual swap on the log
  form automatically re-bases the rotation.
- **event average** = mean of that event's reviews where `stars > 0` (unrated excluded).
- **place average** = mean of the per-event averages for that place.
- **stars display** = `'★'.repeat(round(avg)) + '☆'.repeat(5 - round(avg))`.
- **place suggestions** = distinct place names from that activity's events, newest first,
  substring-filtered by the query, capped at 4.

Seed data used in the prototype (4 breakfasts, 3 walks, real names and comments) is in the logic
class of `myturn.dc.html` — useful as fixtures.

---

## Screens

All screens live inside a 390px-wide column (`max-width: 390px; margin: 0 auto`). Desktop is the
same column centered. Page padding is 22px left/right (26px on Login and Check-email). The
prototype wraps this in a phone bezel for presentation — **do not** build the bezel.

### 1. Login
- **Purpose**: passwordless entry. Email → magic link.
- **Layout**: single column, content top, primary button pinned to the bottom (`margin-top: auto`).
- **Components**
  - Brand mark: 96×96 circle, `background: var(--color-accent)`, `color: var(--color-bg)`,
    Caprasimo 40px, text "my", `box-shadow: var(--shadow-md)`, `margin: 18px 0 26px`.
  - `h1` "myturn" — Caprasimo 52px, `line-height: .95`.
  - Subhead — Figtree 18px/1.45, `max-width: 20ch`, text at 72% opacity:
    "Whose turn is it, where did we go, and was it any good."
  - Email field — `.field` + `.input`, `type="email"`, `inputmode="email"`, label "Your email"
    (14px), placeholder "you@family.com", 17px text, `min-height: 54px`, `padding: 12px 18px`,
    `border-radius: 999px`.
  - Explainer — 15px/1.5 at 62%: "No password. We email you a link, you tap it, you're in for a
    year. That's the whole security system."
  - Primary button `.btn .btn-primary .btn-block` — "Email me a link", 19px, `min-height: 58px`,
    `border-radius: 999px`.

### 2. Check your email
- **Purpose**: confirmation after requesting the link.
- Centered text. 104×104 circle, `background: var(--color-accent-200)`,
  `color: var(--color-accent-700)`, Lucide **mail** 50px inside, animated
  `mtWiggle 2.4s ease-in-out infinite` (±2.5° rotate).
- `h1` 38px "Check your email"; body 18px/1.5 "We sent a link to **{email}**. Tap it on this phone
  and you're in."; hint 15px at 60%: "If it's not there in a minute, check the spam folder. It
  happens to the best of us, Mom."
- Bottom: primary "I tapped the link →" (dev shortcut — in production the emailed link is the
  entry point), plus `.btn-ghost` "Use a different email".

### 3. Home
- **Purpose**: whose turn is it, for every activity, at a glance.
- **Header row**: `h1` "myturn" Caprasimo 40px; sub-line 16px at 65% ("Hi Kathy. Two rotations,
  zero arguments."); right-aligned 48×48 pill `.btn-secondary` with Lucide **settings** (22px) —
  settings/logout affordance. No nav bar in v1.
- **Crew strip**: `background: var(--color-surface)`, `border-radius: var(--radius-lg)`,
  `padding: 14px 16px`, three 52px circular photo slots (Karen, Chad, Kathy) + 14px/1.35 caption
  "Karen, Chad & Kathy. Drop in your photos." One upload per person should propagate to every
  avatar in the app.
- **Activity cards**, one per activity, `background: var(--color-surface)`,
  `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-sm)`, `margin-bottom: 16px`,
  whole card tappable → Activity Detail. Three explored variants (pick one; **ticket** is the
  default):
  - **ticket** — 12px vertical stripe in the next person's color down the left edge; body padding
    `20px 20px 18px`; header row = Lucide activity icon (24px, `--color-accent-700`) + name
    (Caprasimo 21px); then a 54px monogram/photo circle beside an uppercase 13px `.1em` "NEXT UP"
    label with the name in Caprasimo 32px; then "Last time: {place}", star row 17px
    `letter-spacing: 2px` in `--color-accent-700`, and the short date.
  - **stacked** — name + chevron row, then a full-width banner (`radius-md`, padding `14px 18px`)
    filled with the next person's color, "NEXT UP" + name in Caprasimo 40px; footer row places the
    last place left and its stars right.
  - **list** — compact 18px-padded row: 46px avatar, name (Caprasimo 19px), "**{Name}** picks ·
    {last place}" at 15px/68%, chevron.
- Footer note 14px at 50%, centered: "Two things. That's plenty."
- Empty case: an activity with no events shows "Nothing yet" in place of the last-time line.

### 4. Activity Detail
- **Purpose**: the money shot — whose turn, log it, and the full record.
- Back button `.btn-ghost` "← Home", 17px, `min-height: 48px`.
- `h1` 30px, flex row, 8px gap, 24px Lucide activity icon in `--color-accent-700`
  (**coffee** for food, **footprints** for trails). Keep it 30px/24px/8px — 34px wraps
  "Sunday Breakfast" at 390px.
- Sub-line 15px at 62%: "Sundays · Karen, Chad, Kathy".
- **"Next up" banner**, three explored variants (**photo** is the default):
  - **photo** — `radius-lg` block filled with the next person's color, `--shadow-md`, padding 22px;
    84px circular fillable photo slot (3px `rgba(253,246,234,.5)` ring, translucent fill, monogram
    or first name as empty state) beside "NEXT UP" (14px, `.12em`) and the name in Caprasimo 44px;
    nudge line 16px at 80% ("Pick a spot, text the group, act natural." / "Your trail, your pace.").
  - **ribbon** — same fill bled to the screen edges (`margin: 0 -22px 20px`), name in Caprasimo
    60px, no avatar.
  - **spotlight** — on the page ground: 210px halo circle (person color at 15% fill, 33% 3px
    border) behind the name in Caprasimo 62px, `--color-accent-700`, centered.
- Primary button, full width, 19px, `min-height: 58px`, `border-radius: 999px`: "Log this Sunday" /
  "Log today's walk".
- **History** ("The record") — `h2` 22px with a right-aligned count ("4 breakfasts"). Rows:
  `padding: 14px 4px`, `border-bottom: 1px solid var(--color-divider)`, 40px avatar, place name
  17px/600 (ellipsised), meta 14px at 60% "Aug 23 · Kathy picked", right column = stars 15px in
  `--color-accent-700` over a 12px "2 of 3" review count. Newest first. Tap → Event Detail.
- **Empty state** — `var(--color-surface)`, `radius-lg`, 36px padding, centered Lucide
  **calendar** 46px, `h3` 22px "Nothing logged yet", 16px at 65% "Go somewhere, then come back and
  tell on yourselves."

### 5. Log an Event
- **Purpose**: one screen, minimal typing, anyone can do it.
- Back button "← {activity name}"; `h1` 32px "Log breakfast" / "Log the walk".
- **Place** — one `.input`, 18px, `min-height: 56px`, label "Where did you eat?" / "Which trail?",
  placeholder "Diner, cafe, that one place…" / "Trail, park, loop…". Below it, up to 4 suggestion
  rows (`padding: 13px 16px`, divider between, name 17px left, "★★★★☆  2×" at 14px/55% right) —
  shown **before** typing as recent places, filtered as you type. When the query matches nothing
  exactly, a final row "＋ Add “{query}” as a new spot" in `--color-accent-700` 17px/600 creates
  the place inline. No modal, no separate add-new flow.
- **Who picked** — "Who picked?" (15px/600) over wrapping 56px-tall chips: 2px border and a 13%
  tint of the person's color when selected, `--color-divider` border when not; 38px monogram
  circle + name at 18px/600, `border-radius: 999px`. Pre-selected with the derived next-up person.
  Note under it flips: "Pre-filled with whoever's turn it was. Change it if you swapped." →
  "Swapped — the rotation will pick up from here."
- **When** — native `type="date"`, defaults to today, 18px, `min-height: 56px`.
- **Save** — full-width primary, "Save breakfast" / "Save walk", disabled until a place is entered
  (`opacity: .45`). On save: create the event with empty reviews for every member, then navigate
  to Event Detail.

### 6. Event Detail / Rate it
- **Purpose**: rate it, read what everyone else said.
- Post-save nudge banner: `var(--color-accent-2-200)` on `--color-accent-2-900`, `radius-md`,
  `padding: 13px 16px`, Lucide **check-circle** 22px + "Logged. Now the fun part — rate it."
  Shown only immediately after a save.
- `h1` 32px place name; meta row 16px at 70%: long date · 26px avatar · "Kathy picked".
- Link row 16px/600 in `--color-accent-700`: "All visits to {place} →" → Place Detail.
- **One review card per member**, `radius-lg`, `padding: 18px`, `margin-bottom: 14px`.
  - Mine: `background: var(--color-accent-100)`, `border: 2px solid var(--color-accent)`, tag
    "Your review". Others: `var(--color-surface)`, 1px divider border, tag = their role or
    "Hasn't rated yet".
  - Header: 44px avatar + name (Caprasimo 20px) + 13px tag at 55%.
  - **Star input** — the most-used control in the app. Three explored variants (**jumbo** is the
    default): **jumbo** = 46px glyphs, `padding: 4px 3px` (≈54px targets), with a caption under it
    from ["Tap a star", "Never again", "It was fine", "Pretty good", "Great", "Perfect, no notes"];
    **classic** = same behavior at 32px; **pills** = five 54px circles numbered 1–5, filled
    `--color-accent` up to the score. Filled = `--color-accent`; empty = text at 28%. Tapping a
    filled star plays `mtPop` (300ms ease: scale 1 → 1.25 with −6° rotate → 1). Only my card is
    interactive; others render read-only at the same size.
  - Mine also gets: comment `.input` (17px, 52px min-height, "A word about it (optional)");
    **food only** "What I had (optional)"; **trail only** a 10px-gap row of "Miles (opt.)"
    (`inputmode="decimal"`) and "Minutes (opt.)" (`inputmode="numeric"`). Optional and unlabelled
    beyond the placeholder — low friction by design.
  - Others' cards show their comment at 17px/1.45, "(no comment)" when rated silently, or
    "Nudge them." when unrated.
- Footer line 15px at 58%, centered — "Nobody has rated yet. Someone go first." / "Still waiting on
  Karen, Chad and Kathy." (comma list, final "and") / "Everyone has weighed in. Democracy."
- Full-width primary "Done" → back.

### 7. Place Detail
- **Purpose**: the "was this one good?" page, checked before picking.
- `h1` 34px place name.
- Two stat tiles side by side, `var(--color-surface)`, `radius-md`, `padding: 14px 16px`: average
  to one decimal and visit count, each Caprasimo 30px over a 14px/60% label ("avg rating",
  "visits"/"visit").
- Star row 17px, `letter-spacing: 3px`, `--color-accent-700`.
- Per-visit list, newest first, each `padding: 16px 0` with a 1px top divider: long date (18px/700)
  left, "{Name} picked" (14px/60%) right; then one row per member — 30px avatar, their stars (15px,
  `--color-accent-700`), their comment (16px/1.4, "—" when none).

---

## Interactions & behavior
- **Navigation** is a stack, not a router-less swap: every forward move pushes the current screen so
  back always returns to where you were (Event Detail → back → Activity Detail, even when reached
  through a save). In Next.js use real routes: `/`, `/a/[activityId]`, `/a/[activityId]/log`,
  `/e/[eventId]`, `/p/[placeId]`, `/login`.
- **Entering screens** animate `mtRise` — 300–350ms ease, `opacity 0 → 1` with `translateY(14px)`.
- **Star tap** writes immediately (no save button) and pops the star.
- **Autocomplete** filters on every keystroke, case-insensitive substring, max 4 rows.
- **Save** is disabled until the place field is non-empty — the only validation in v1.
- **Logout** returns to Login and clears the email field.
- No modals anywhere. No loading or error states are designed; add your app's conventions
  (optimistic writes are appropriate — the data is tiny and the group is three people).
- Interaction states come from the Organic sheet: accent-ramp hovers, `--color-accent-600/700`
  pressed, and a 2px `--color-accent` `:focus-visible` ring. Don't restyle them.

## State
- Session: current person (`ME` — Kathy in the prototype), email input, magic-link state.
- Server data: activities, people, events, reviews, places.
- Local UI: nav stack; log-form draft `{ place, pickedById, date }`; `justSaved` flag driving the
  rate nudge; per-card review edits (debounce and persist).
- Everything else — next up, averages, star strings, suggestions, counts, waiting copy — is derived
  at render time. Don't persist derived values.

## Design tokens (from Organic `styles.css`, included)
- **Ground/ink**: `--color-bg` #f5ead8 · `--color-surface` #ebddc5 · `--color-text` #201e1d ·
  `--color-divider` = text at 16%.
- **Accent (terracotta)** #c67139 with a 100–900 ramp (#fff2eb → #402310). Body-size accent text
  uses `--color-accent-700` #8c491a, never the base.
- **Accent 2 (sage)** #7a8a5e with its own 100–900 ramp — used for Chad and the post-save banner.
- **Person colors** (each person keeps one everywhere): Karen #c67139, Chad #8c491a,
  Kathy #7a8a5e. Monograms KA / CH / KY as photo fallbacks.
- **Type**: Caprasimo 400 (`--font-heading`, all headings, numerals in stat tiles, buttons) over
  Figtree 400/600/700 (`--font-body`). Sizes used: 62/60/52/44/40/38/34/32/30/22/21/20/19 heading,
  18/17/16/15/14/13 body. **16px is the floor for body copy.**
- **Spacing**: `--space-1..8` = 4.4 / 8.8 / 13.2 / 17.6 / 26.4 / 35.2px.
- **Radius**: `--radius-sm` 8 · `--radius-md` 16 · `--radius-lg` 28 · `999px` for buttons, chips,
  inputs on Login, and every avatar.
- **Shadow**: `--shadow-sm/md/lg` from the sheet.
- **Dark mode** overrides (applied as custom properties on the app root): `--color-bg` #241d18 ·
  `--color-surface` #332a22 · `--color-text` #f7ecdd · `--color-divider` text at 20% ·
  `--color-accent` #e8945c · `--color-accent-700` #f0b183. Person colors are unchanged.
  Wire it to `prefers-color-scheme` plus a manual override.

## Assets
- **Icons**: Lucide (lucide.dev) at `stroke-width: 2.75`, `stroke-linecap/linejoin: round`,
  `currentColor`. Used: settings, mail, calendar, check-circle (circle + check), coffee,
  footprints. Install `lucide-react` rather than pasting paths.
- **Fonts**: Caprasimo 400 + Figtree 400/600/700 (Google Fonts). Self-host via `next/font`.
- **Photos**: none shipped. Avatars are user-uploaded per person; the prototype uses drop-in
  placeholders. Build a real upload (crop to square, store a URL on `Person`), and fall back to the
  colored monogram when `photoUrl` is null.
- **PWA**: intended to be added to the iPhone home screen — needs a manifest, `apple-touch-icon`,
  and `theme-color`. The "my" mark on Login (terracotta circle, Caprasimo) is the icon starting
  point.

## Deliberately not in v1
No fitness dashboard over the trail metrics, no "suggest a place" recommendations, no event photos.
Nothing in the schema blocks them. Also missing on purpose: a browsable places list — Place Detail
is reachable only through a past visit today.

## Files in this bundle
- `myturn.dc.html` — the full interactive prototype (all 7 screens, real state, the three variant
  sets behind props: `homeCard`, `nextUpBanner`, `starStyle`, plus `theme`). Design reference only.
- `support.js`, `image-slot.js` — runtime the prototype needs to open in a browser. Not for porting.
- `styles.css` — the Organic design-system token sheet and component classes. **Port these tokens.**
- `README.md` — this document.
