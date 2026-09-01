# MyTurn — Technical Guide

Living documentation: the actual current state of how this project is built
and why. Chronology lives in `git log` and PR descriptions, not here.

## Overview

Private family web app for tracking rotating "whose turn is it to pick"
outings (Sunday Breakfast, Friday Walking), the places we went, and
per-person ratings. A handful of allowlisted family users, phone-first,
zero recurring cost. Epic: issue #1.

## Architecture

- **App**: Next.js 16 (App Router) + TypeScript, single deployable.
  Server-rendered; Node runtime only — no edge runtime anywhere.
- **Data**: SQLite via `better-sqlite3` (in-process) + Drizzle ORM. The
  database is one file; there is no database server. See "Data model".
- **Hosting**: one Docker container on a home Linux server (Orchid; Pearl
  is the fallback and backup target), exposed **only** through a Cloudflare
  Tunnel. No Vercel — decided in the issue #1 comments (2026-08-29): one
  auth layer, no serverless cold starts, DB as a local file, zero cost.
- **Auth**: magic-link email via Resend, allowlisted family addresses,
  long-lived DB-backed sessions. See "Auth".

## Local development

Node 24 + pnpm 11 (pinned via `packageManager`).

- `pnpm dev` — dev server
- `pnpm test` / `pnpm test:watch` — Vitest
- `pnpm build` — production build
- `pnpm lint` — ESLint
- `pnpm db:generate` — emit a migration after editing `db/schema.ts`
- `pnpm db:seed` — seed fixtures (no-op if data exists; `--reset` wipes)

`better-sqlite3` loads a **bundled prebuilt binary**; its implicit node-gyp
build must stay disabled in `pnpm-workspace.yaml` (`allowBuilds:
better-sqlite3: false`) or installs start requiring a C++ toolchain.
`.env` is created by copying `.env.example`; nothing in it is needed until
the auth work.

## Routes

Live routes: `/` (Home), `/a/[activityId]` (Activity Detail),
`/a/[activityId]/log` (Log an Event), `/e/[eventId]` (Event Detail /
Rate it), `/login`, and `/auth/verify` (magic-link redemption). There
is deliberately **no** `/p/[placeId]` route: the spec's Place Detail
screen was reworked in review (#22) into an inline "All visits" section
at the bottom of Event Detail, with the top link an in-page anchor jump
— the standalone page was a dead-end leaf about the place already on
screen. A browsable places list also stays out of v1 (backlog). Logging creates
the place on the fly when the name has no case-insensitive match in the
activity, inserts empty reviews for every member in one transaction,
and redirects to the event with `?saved=1`.
`/e/[eventId]?saved=1` shows the post-save nudge banner (#20 navigates
there after logging). Unknown ids 404 via `notFound()`.
Per-activity copy that is not in the schema (log button label, nudge
line, history noun) derives from `activities.kind`.

## Auth

Hand-rolled magic-link flow in `lib/auth.ts` (no Auth.js — its adapter
tables and user model duplicate `people`, which IS the allowlist; the
epic's design is ~200 auditable lines against our own schema).

- **Flow**: login form → server action creates a one-time 15-minute
  token in `login_tokens` (SHA-256 hash only) and emails the link via
  Resend; `/auth/verify` redeems it once, opens a 1-year session in
  `sessions` (hash only), and sets the `myturn_session` httpOnly
  cookie (`sameSite=lax`, `secure` in production). Logout (settings
  menu) deletes the session row and the cookie.
- **Allowlist / anti-enumeration**: only emails in `people` get a
  token, but the UI always shows "Check your email" — unknown
  addresses and rate-limited sends are indistinguishable from real
  ones.
- **Rate limits**: send — 3 per email per 10 minutes (counted in
  `login_tokens`); verify — 10 per IP per minute (in-memory fixed
  window; acceptable to reset on restart for a single in-process
  server).
- **Session checks**: `getSessionPerson()` in every page/action is the
  real check; `proxy.ts` (Next 16's middleware rename) only redirects
  on cookie *presence* and must not import `lib/auth` (it would pull
  `better-sqlite3` into the proxy bundle — the cookie name is
  duplicated there on purpose).
- **Local dev**: with `RESEND_API_KEY` unset the link is printed to
  the dev-server log instead of emailed (`[auth] magic link for …`).
  `MAIL_FROM` sets the from address in production.
- **Error states** (not in the spec, our convention): invalid, reused,
  or expired links land on `/login?expired=1`, which shows a
  plain-language "that link had expired" note.

## Data model

Schema in `db/schema.ts` (Drizzle, SQLite), per the design spec's data
model: `people`, `activities`, `places` (scoped per activity), `events`,
`reviews`. Key decisions:

- **Rotation order is the `memberIds` JSON array on `activities`** — no
  separate rotations table (the epic's draft had one; the spec's simpler
  shape won). Array order is rotation order, and "next up" derives from
  the latest event's picker, so a manual swap re-bases the rotation with
  no stored state.
- **Derived values are never persisted.** `lib/derived.ts` holds the pure
  helpers — `nextUp`, `eventAverage`, `placeAverage`, `starString`,
  `placeSuggestions` — typed structurally so they run without a database;
  `lib/derived.test.ts` covers them. Notable pinned behaviors: "latest
  event" orders by outing date, then `createdAt`, then id (backfilled rows
  can't masquerade as latest); a latest picker who left the rotation falls
  back to `memberIds[0]`; `stars: 0` means unrated and is excluded from
  event averages; a fully unrated visit still counts as 0 in a place's
  average (prototype behavior). Reviews also carry an optional second
  rating, `omeletteQuality` (0–5, null = not given, food activities
  only — the server action rejects it for trails), separate from
  `stars` and excluded from star averages; Event Detail's inline place
  summary shows an "omelette" stat tile for food places — a flat mean
  of the scores actually given there (no per-event step). `people.role` ("Mom",
  "Aunt") is the tag on others' review cards; nullable, and migration
  0002 backfills the seed people so existing databases don't need a
  reseed.
- **Constraints in the database**, not just app code: unique email; unique
  `(activity_id, lower(name))` on places so create-on-the-fly can't dupe;
  composite PK `(event_id, person_id)` on reviews; `stars BETWEEN 0 AND 5`
  CHECK; FK enforcement via `PRAGMA foreign_keys = ON` (off by default in
  SQLite); reviews cascade-delete with their event.
- **Migrations** are generated to `db/migrations` by `pnpm db:generate`
  and applied automatically the first time `db/index.ts` is imported
  (instant and idempotent with in-process SQLite; the connection is cached
  on `globalThis` for dev-mode reloads, with WAL enabled). The migrator
  reads the folder via `fs` at runtime, invisible to standalone output
  tracing, so `next.config.ts` pins `db/migrations` in
  `outputFileTracingIncludes`. Pages that read the DB export
  `dynamic = "force-dynamic"` — the build machine has no database, and
  the data changes per request.
- **Seed fixtures** (`pnpm db:seed`): Karen/Chad/Kathy, Sunday Breakfast +
  Friday Walking, and the prototype's 4 breakfasts + 3 walks with real
  comments. Person emails are placeholders until the auth allowlist (#17).
  Nothing assumes exactly two activities.

## Docker & deployment

Multi-stage `Dockerfile`: `node:24-alpine` (better-sqlite3 ships musl
prebuilds), Next.js `output: "standalone"`, runs as the unprivileged `node`
user, DB at `/data/myturn.db` on the `myturn-data` named volume.

`docker-compose.yml` runs two services on one internal bridge network with
**no published ports**:

- `app` — listens on `0.0.0.0:3000` *inside its container*, which is
  unreachable from the host and LAN because no ports are mapped. (This
  supersedes the epic's "binds to 127.0.0.1" wording: container loopback
  would not be reachable from a sibling container. The security intent —
  nothing reaches the app except the tunnel — is unchanged.)
- `cloudflared` — behind the `tunnel` compose profile (issue #5), connects
  *outbound* to Cloudflare and forwards requests to `app:3000` over the
  compose network. Plain `docker compose up` runs only the app.

The Docker image is verified in CI (the "Docker build" job builds it and
confirms the container serves), so no Docker install is needed on the
Windows dev workstation. On the server (or any Linux box), the equivalent
manual check without publishing a port is:

```bash
docker compose up -d --build app
docker run --rm --network myturn-site_internal curlimages/curl -fsS -o /dev/null -w "%{http_code}" http://app:3000/
```

Moving hosts is `docker compose up` plus a copy of the DB file — nothing
is host-specific.

### Review workflow note

There is no Vercel preview deployment. The pre-merge signals are the CI
"Tests" check plus running the change locally (`pnpm dev`, or the compose
verification above for infra changes). Production deploy = pull + rebuild
on the server (ops details land with issue #12).

## Testing & CI

Vitest; tests live next to the code they cover (`*.test.ts`). Coverage is
selective — pure logic with non-obvious behavior (currently the derived
helpers in `lib/derived.ts`). GitHub Actions runs `pnpm test` on every PR
and push to main as the required-by-discipline "Tests" check.

## Conventions

- Server-only libraries (`better-sqlite3`, future auth helpers) never
  reach client components; data flows through server components and server
  actions.
- Next 16 renamed middleware: the file convention is `proxy.ts`. When auth
  lands it is a redirect convenience only — real session checks belong in
  the data-access layer every page/action calls (issue #4).
- UI follows the design system documented in the "Design system" section
  below; components read tokens (or the Tailwind utilities generated from
  them), never hard-coded values.

## Design system

The UI implements the **Organic** system from the design handoff in
`docs/design/`: `myturn-v1.md` is the spec (screens, exact values, copy),
`styles.css` the original token sheet, and `myturn.dc.html` an interactive
prototype — design reference only; its `support.js` runtime must never be
ported (the bundle is excluded from ESLint for this reason). Token values
are final; retune in the handoff, not ad hoc.

- **Tokens** live in `app/globals.css` in a Tailwind v4 `@theme` block:
  cream/sand ground (`--color-bg`, `--color-surface`), near-black ink
  (`--color-text`, with `--color-divider` mixed from it), terracotta
  `--color-accent` and sage `--color-accent-2` each with a 100–900 ramp on
  a shared OKLCH lightness scale, a neutral ramp, `--radius-sm/md/lg`
  (8/16/28px) and three ink-tinted shadows. Tailwind's default palettes are
  wiped (`--color-*: initial` etc.) so utilities can only produce Organic
  colors — the "no hard-coded hex in components" rule is enforced by the
  theme itself. The non-Tailwind `--space-1..8` scale sits on `:root`.
- **Dark mode**: the spec's override tokens (bg, surface, text, divider,
  accent, accent-700; person colors unchanged) apply under
  `prefers-color-scheme: dark` unless the user chose light, and under a
  manual `data-theme="dark"`. An inline script in `app/layout.tsx` applies
  the stored choice (localStorage key `theme`) before first paint;
  `components/theme-toggle.tsx` flips it, reading the effective theme
  through `useSyncExternalStore`. The toggle lives inside
  `components/settings-menu.tsx` (the Home header's 48px pill — a native
  `<details>` disclosure; its Log out entry stays disabled until #17).
- **Fonts** self-hosted via `next/font/google`: Caprasimo 400
  (`--font-heading` — all headings, buttons, stat numerals) over Figtree
  variable (`--font-body`). 16px is the floor for body copy.
- **Icons**: `lucide-react`, rendered exclusively through
  `components/icon.tsx`, which defaults to the Organic stroke treatment
  (strokeWidth 2.75, round caps/joins).
- **Stars**: `components/star-rating.tsx` is the one star control — jumbo
  46px glyphs, ~54px tap targets, `mtPop` replayed on the filled run per
  tap, the six-caption list, and a same-size read-only rendering. Writes
  are immediate (no save button): star taps call the `updateMyReview`
  server action then `router.refresh()` so the waiting line updates;
  text fields debounce 500ms and flush on blur, with no refresh. Empty
  stars inherit `currentColor` at 28% so they stay visible on the
  accent-100 "my review" card, which sets `text-accent-900` explicitly —
  that fill does not flip in dark mode, so the default dark ink would
  vanish on it.
- **Avatars**: every person circle renders through `components/avatar.tsx`
  — photo when `photoUrl` is set, colored monogram fallback otherwise
  (glyph at 0.36 × size). Person colors come from the `people` table and
  are applied as inline styles (data, not styling); text on person-colored
  fills uses the fixed-cream `--color-person-ink` token, which does not
  flip in dark mode.
- **Motion**: `mtRise` (screen enter, 320ms), `mtPop` (star tap),
  `mtWiggle` (idle wiggle) keyframes with `.mt-rise` / `.mt-pop` /
  `.mt-wiggle` helpers, all disabled under `prefers-reduced-motion`.
- **App shell** (root layout): one centered column, `max-width: 390px`,
  22px side padding, no phone bezel — desktop gets the same column.
- Component classes the spec references by name (`.btn` variants, `.field`,
  `.input`, `.text-muted`, `.washed`) are ported into `@layer components`
  so per-screen Tailwind utilities can override them; spec sections the app
  will never use (dialogs, tables, nav, segmented controls) were not
  ported.
