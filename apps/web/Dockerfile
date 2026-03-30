# Stage 1: Prune monorepo to only what the web app needs
FROM oven/bun:1-alpine AS pruner
WORKDIR /app
COPY . .
RUN bun install --ignore-scripts
RUN ./node_modules/.bin/turbo prune web --docker

# Stage 2: Install and build
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lock ./bun.lock
RUN bun install --frozen-lockfile --ignore-scripts
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/tsconfig.json ./
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN cd packages/shared && bun run build
RUN cd packages/widget && bun run build
RUN cd apps/web && bun run generate-routes
RUN cd apps/web && bun run build

# Stage 3: Serve with nginx
FROM nginx:1.29-alpine-slim AS runner
LABEL org.opencontainers.image.source=https://github.com/Fidasek009/pb138
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
