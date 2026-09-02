# syntax=docker/dockerfile:1
# better-sqlite3 ships linuxmusl prebuilds, so alpine needs no C++ toolchain.

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# all interfaces *inside the container*; compose publishes no host ports
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV DATABASE_PATH=/data/myturn.db

RUN mkdir /data && chown node:node /data
USER node

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# Seed sources, so provisioning runs inside the container against the
# volume: docker compose exec app node db/seed.ts (deps like drizzle-orm
# and better-sqlite3 are already in the standalone node_modules).
COPY --from=build --chown=node:node /app/db ./db
COPY --from=build --chown=node:node /app/lib ./lib

EXPOSE 3000
CMD ["node", "server.js"]
