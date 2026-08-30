# MyTurn

Private family app for tracking whose turn it is to pick Sunday breakfast
and Friday walks — plus where we went, and whether it was any good.

Self-hosted: one Next.js container + SQLite on a home server behind a
Cloudflare Tunnel. See [TechnicalGuide.md](TechnicalGuide.md) for how it's
built; the plan lives in [issue #1](https://github.com/reclinerhead/myturn/issues/1).

## Quick start

```bash
pnpm install
pnpm dev
```

`pnpm test` runs the Vitest suite; `pnpm build` makes the production build.
