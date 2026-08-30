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
- **Auth** (issue #4, not yet implemented): magic-link email via Resend,
  allowlisted family addresses, long-lived DB-backed sessions.

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
  rating, `omeletteQuality` (0–5, null = not given), which is separate
  from `stars` and excluded from all averages; its UI lands with the
  Event Detail screen (#21).
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
