# Stage 1: Prune monorepo to only what the API needs
FROM oven/bun:1-alpine AS pruner
WORKDIR /app
COPY . .
RUN bun install --ignore-scripts
RUN ./node_modules/.bin/turbo prune api --docker

# Stage 2: Install production dependencies from the pruned lockfile
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lock ./bun.lock
RUN bun install --frozen-lockfile --production --ignore-scripts

# Stage 3: Build shared packages
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lock ./bun.lock
RUN bun install --frozen-lockfile --ignore-scripts
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/tsconfig.json ./
RUN cd packages/shared && bun run build

# Stage 4: Runner
FROM oven/bun:1-alpine AS runner
LABEL org.opencontainers.image.source=https://github.com/Fidasek009/pb138
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/api/src ./apps/api/src
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/package.json ./
# oven/bun:1-alpine ships a 'bun' user at UID/GID 1000 — reuse it instead of creating a conflicting one
RUN chown -R bun:bun /app
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["bun", "run", "apps/api/src/index.ts"]
