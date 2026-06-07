# Stage 1: Prune monorepo to only what the API needs
FROM oven/bun:1-alpine AS pruner
WORKDIR /app
COPY . .
RUN bunx turbo prune api --docker

# Stage 2: Build packages
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lock ./bun.lock
RUN bun install --frozen-lockfile --ignore-scripts
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/tsconfig.json ./
RUN cd packages/shared && bun run build
RUN cd packages/db && bun run build

# Stage 3: Production runner - install prod deps in context of full workspace
FROM oven/bun:1-alpine AS runner
LABEL org.opencontainers.image.source=https://github.com/talqo/talqo-platform
WORKDIR /app
# Copy workspace structure for proper resolution
COPY --from=builder /app/package.json ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/db/package.json ./packages/db/
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/drizzle.config.ts ./packages/db/
COPY --from=builder /app/packages/db/drizzle ./packages/db/drizzle
COPY --from=builder /app/packages/db/migrate.ts ./packages/db/
COPY --from=pruner /app/out/bun.lock ./bun.lock
# Install production dependencies with workspace context
RUN bun install --frozen-lockfile --production --ignore-scripts
COPY --from=builder /app/apps/api/tsconfig.json ./apps/api/
COPY --from=builder /app/apps/api/src ./apps/api/src
RUN chown -R bun:bun /app
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["bun", "run", "apps/api/src/index.ts"]
