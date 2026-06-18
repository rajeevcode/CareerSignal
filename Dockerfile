FROM node:20-bookworm-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .

RUN pnpm --filter @careersignal/shared build \
    && pnpm --filter @careersignal/db build \
    && pnpm --filter @careersignal/web build

FROM base AS runner

ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app ./

RUN mkdir -p /app/data/uploads \
    && chown -R nextjs:nodejs /app/data \
    && chmod +x ./scripts/docker-web-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

ENTRYPOINT ["./scripts/docker-web-entrypoint.sh"]

FROM base AS dev

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "pnpm --filter @careersignal/shared build && pnpm --filter @careersignal/db build && pnpm dev:web"]
