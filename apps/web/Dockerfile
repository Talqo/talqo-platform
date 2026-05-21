# Stage 1: Prune monorepo to only what the web app and widget need
FROM oven/bun:1-alpine AS pruner
WORKDIR /app
COPY . .
RUN bunx turbo prune web widget --docker

# Stage 2: Build web and all its dependencies
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lock ./bun.lock
RUN bun install --frozen-lockfile --ignore-scripts
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/tsconfig.json ./
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
ARG VITE_SENTRY_DSN
ENV VITE_SENTRY_DSN=${VITE_SENTRY_DSN}
# Build widget bundle with API URL baked in
RUN cd packages/widget && bun run build
# Copy widget bundle to web public so Vite copies it to dist
RUN mkdir -p apps/web/public && cp packages/widget/dist/widget-bundle.js apps/web/public/
# Build web app
RUN bunx turbo run build --filter=web... --log-order=stream

# Stage 3: Serve with nginx
FROM nginx:1.29-alpine-slim AS runner
LABEL org.opencontainers.image.source=https://github.com/PagePal-Agent/pagepal
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chown -R nginx:nginx /var/cache/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid
USER nginx
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
