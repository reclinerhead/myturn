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
  database is one file; there is no database server. Schema and migrations
  land with issue #3.
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

`better-sqlite3` loads a **bundled prebuilt binary**; its implicit node-gyp
build must stay disabled in `pnpm-workspace.yaml` (`allowBuilds:
better-sqlite3: false`) or installs start requiring a C++ toolchain.
`.env` is created by copying `.env.example`; nothing in it is needed until
the auth work.

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
selective — pure logic with non-obvious behavior (first real suite arrives
with the rotation engine, issue #6). `vitest.config.ts` sets
`passWithNoTests` until then. GitHub Actions runs `pnpm test` on every PR
and push to main as the required-by-discipline "Tests" check.

## Conventions

- Server-only libraries (`better-sqlite3`, future auth helpers) never
  reach client components; data flows through server components and server
  actions.
- Next 16 renamed middleware: the file convention is `proxy.ts`. When auth
  lands it is a redirect convenience only — real session checks belong in
  the data-access layer every page/action calls (issue #4).
- Design tokens live in `app/globals.css` (Tailwind v4 `@theme`): warm
  "family table" palette (paper `--background`, espresso `--foreground`,
  terracotta `--accent`, `--sage`), Fraunces for display type, Atkinson
  Hyperlegible for body text (chosen for legibility — "Mom-proof" is a
  requirement). Single light theme for now; dark mode is issue #13.
