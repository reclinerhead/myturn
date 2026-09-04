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
- **Data**: Turso (libSQL — SQLite's dialect, hosted) via `@libsql/client`
  + Drizzle ORM. Local dev uses a plain SQLite file through the same
  client (`file:./data/myturn.db`) — no cloud account needed to develop.
  See "Data model".
- **Photos**: Vercel Blob in production, local files in dev — served
  through the session-gated `/avatars/[personId]` route either way.
- **Hosting**: Vercel (Todd's existing Pro plan) at `myturn.toddtech.llc`
  — the domain's DNS lives natively at Vercel. Pivoted 2026-09-02 (#40),
  repealing the epic's original no-Vercel/self-host plan: the domain's
  DNS staying at Vercel ruled out Cloudflare Tunnel, and Todd vetoed
  domain purchases and third-party hostnames. $0 additional cost.
- **Auth**: magic-link email via Resend, allowlisted family addresses,
  long-lived DB-backed sessions. See "Auth".

## Local development

Node 24 + pnpm 11 (pinned via `packageManager`).

- `pnpm dev` — dev server
- `pnpm test` / `pnpm test:watch` — Vitest
- `pnpm build` — production build
- `pnpm lint` — ESLint
- `pnpm db:generate` — emit a migration after editing `db/schema.ts`
- `pnpm db:migrate` — apply migrations (local file, or Turso when
  `TURSO_DATABASE_URL` is set)
- `pnpm db:seed` — provision (no-op if data exists; `--reset` wipes;
  `--with-fixtures` adds demo events for dev)

`.env` is created by copying `.env.example`. With everything left empty,
dev runs fully locally: SQLite file for data, `data/avatars` files for
photos, magic links printed to the dev-server log.

## Routes

Live routes: `/` (Home), `/a/[activityId]` (Activity Detail),
`/a/[activityId]/log` (Log an Event), `/e/[eventId]` (Event Detail /
Rate it), `/share` (a QR code for the site — see "Design system"),
`/login`, and `/auth/verify` (magic-link redemption). There
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
  Resend. `/auth/verify` is a page whose GET never touches the token
  (mail scanners and SafeLinks-style gateways fetch emailed URLs and
  were burning the one-time token — #47); its single "Sign me in"
  button POSTs the redemption, which opens a 1-year session in
  `sessions` (hash only) and sets the `myturn_session` httpOnly cookie
  (`sameSite=lax`, `secure` in production). Logout (settings menu)
  deletes the session row and the cookie.
- **Allowlist / anti-enumeration**: only emails in `people` get a
  token, but the UI always shows "Check your email" — unknown
  addresses and rate-limited sends are indistinguishable from real
  ones.
- **Rate limits**: send — 3 per email per 10 minutes (counted in
  `login_tokens`, so it holds across serverless instances); verify —
  10 per IP per minute (in-memory fixed window, which on Vercel is
  per-instance and resets on cold start — a soft limit, acceptable
  because verify only burns invalid tokens).
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
  CHECK; foreign keys enforced (libSQL enables them by default — verified
  empirically in #40); reviews cascade-delete with their event.
- **Migrations** are generated to `db/migrations` by `pnpm db:generate`
  and applied **explicitly** with `pnpm db:migrate` — never at import
  time, because serverless instances would race the DDL (#40; the same
  race once broke the Docker CI build). Run it after every schema change
  and once at provisioning; it shares the standard drizzle journal, so
  re-runs are no-ops. Pages that read the DB export
  `dynamic = "force-dynamic"` — the build machine has no database, and
  the data changes per request.
- **Seeding is split** (#33, #40): `pnpm db:seed` provisions the real
  family — Todd/Karen/Chad/Kathy with emails from `.env` (`SEED_EMAIL_*`,
  gitignored; placeholder fallbacks keep dev working) — plus the two
  activities, and installs any local `data/avatars/*.jpg` through the
  storage layer (Blob when its token is set, files otherwise), linking
  `photoUrl`. Production provisioning = set the Turso + Blob + seed env
  locally, then `pnpm db:migrate && pnpm db:seed`. `--with-fixtures`
  adds the prototype's 7 demo events (dev only; written against the
  prototype's memberships, which the derived helpers tolerate). Rotation
  orders: breakfast `[karen, todd, chad]`, walking `[kathy, todd, karen]`
  — position 0 has the first turn. Nothing assumes exactly two
  activities.

## Deployment (Vercel)

The Vercel project builds from this repo (`main` → production at
`myturn.toddtech.llc`; every PR gets a preview deployment, which is the
workflow's Stage 3 signal alongside the Tests check). CI runs Tests +
Build jobs; there is no Docker anywhere anymore (#40 removed the
Dockerfile/compose stack along with the self-hosting plan).

- **Env** (Vercel project settings): `TURSO_DATABASE_URL`,
  `TURSO_AUTH_TOKEN`, `RESEND_API_KEY`, `MAIL_FROM`,
  `APP_BASE_URL=https://myturn.toddtech.llc`. `BLOB_READ_WRITE_TOKEN`
  is injected by attaching a Blob store to the project.
- **Provisioning** a fresh database runs from a dev machine with the
  production env in `.env`: `pnpm db:migrate && pnpm db:seed` (uploads
  local avatar photos to Blob and links them).
- **Schema changes** after launch: merge the migration, then run
  `pnpm db:migrate` against Turso — deploys never run DDL themselves.
- **Backups / ops** (#12, to be re-scoped): Turso's point-in-time
  story plus optionally a local pull; logs and health via the Vercel
  dashboard.

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
  `<details>` disclosure with Theme, Photo, Share myturn, and Log out
  rows).
- **Share (#62)**: `/share` renders a QR code of the site root for
  handing the app across a table — `APP_BASE_URL` (the same value the
  magic-link emails use, so previews encode the real site and dev
  encodes localhost), never anything session-specific. It is a page
  rather than a dialog because the 192px menu cannot hold a scannable
  code and the spec's dialog styles were never ported.
  `components/qr-code.tsx` renders the `qrcode` package's module matrix
  as inline SVG on the server (one `currentColor` path, 4-module quiet
  zone baked into the viewBox) — no PNG route, no client JS. The panel
  is deliberately fixed-color: `person-ink` cream behind `neutral-900`
  ink, neither of which flips in dark mode, because inverted codes scan
  unreliably.
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
- **Photos**: tapping your face in the settings menu's "Photo" row
  (`components/avatar-upload.tsx`; the spec's Home crew strip was
  removed in review) picks a photo, center-crops it square
  to 512px client-side (canvas; EXIF orientation honored — no server
  image library), and posts it to the `uploadAvatar` action, which
  stores it via `lib/avatars.ts` — Vercel Blob in production, a file
  under `data/avatars` in dev — and stamps `photoUrl` with a `?v=`
  cache-buster. `/avatars/[personId]` serves the bytes (session-gated,
  id-alphabet guard, immutable caching), so photos never get a public
  URL of record. Own photo only — the action rejects any target other
  than the session person (#35); one upload propagates to every avatar
  size.
- **Motion**: `mtRise` (screen enter, 320ms), `mtPop` (star tap),
  `mtWiggle` (idle wiggle) keyframes with `.mt-rise` / `.mt-pop` /
  `.mt-wiggle` helpers, all disabled under `prefers-reduced-motion`.
- **App shell** (root layout): a normal document — one centered column,
  `max-width: 390px`, 22px side padding, no phone bezel, no
  viewport-filling min-height. Desktop gets the same column. Pages are
  as tall as their content. Chrome iOS launched from Mail (the
  magic-link path) paints the page under its URL bar — about 110px,
  enough to hide Home's header and clip the verify-page mark (#51).
  That is an overlay, not scroll; CSS viewport units cannot see the
  bar. A first-paint script pads that tab 120px (`--mt-chrome-pad`)
  when it lands on `/auth/verify` or a history-length-1 touch
  navigation, and keeps the pad for the rest of the tab. A user
  refresh retunes Chrome and clears the pad. The installed PWA and
  ordinary tabs are untouched. Safe-area paddings stay as no-ops
  without `viewport-fit=cover` (the PWA insets itself).
- **Install (PWA, #24)**: `app/manifest.ts` declares standalone display
  with the cream ground as background/theme; `theme-color` metas cover
  both themes. Icons are the login brand mark (terracotta "my" circle in
  Caprasimo) rendered from the real font at `public/icon-192.png`,
  `public/icon-512.png`, and `app/apple-icon.png` (auto-linked as
  apple-touch-icon). No service worker — offline support is deliberately
  out of v1.
- Component classes the spec references by name (`.btn` variants, `.field`,
  `.input`, `.text-muted`, `.washed`) are ported into `@layer components`
  so per-screen Tailwind utilities can override them; spec sections the app
  will never use (dialogs, tables, nav, segmented controls) were not
  ported.
