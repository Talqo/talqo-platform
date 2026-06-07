---
paths:
  - "**/Dockerfile"
  - "**/docker-compose.yml"
  - "**/docker-compose.prod.yml"
---

## Context

- **Immutability:** No modify running containers. Build new images for changes
- **Efficiency:** Minimize image size and build time. Multi-stage, caching
- **Security:** Run as non-root, scan vulns, minimal base images
- **Portability:** Externalize config. Images run same everywhere

## Best Practices
### Dockerfile

#### Multi-Stage Builds

Separate build deps from runtime

```dockerfile
# ❌ Bad: Single stage, root, vague tag
FROM oven/bun:latest
COPY . .
RUN bun install
CMD bun start

# ✅ Good: Multi-stage, pinned version, non-root
# Stage 1: Build
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Stage 2: Runtime
FROM oven/bun:1-alpine AS runner
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lockb ./
RUN bun install --production --frozen-lockfile
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["bun", "run", "dist/index.js"]
```

#### Layer Caching

Copy lockfile + package.json before source. Maximize cache reuse.

```dockerfile
FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
CMD ["bun", "run", "server.ts"]
```

### Compose

```yaml
# ❌ Bad: Version 2, no resource limits, hardcoded secret
version: '2'
services:
  db:
    image: postgres
    environment:
      POSTGRES_PASSWORD: password123

# ✅ Good: Modern format, explicit versions, secrets
services:
  db:
    image: postgres:18-alpine
    restart: always
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - db_data:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          cpus: '0.50'
          memory: 512M

secrets:
  db_password:
    file: ./secrets/db_password.txt

volumes:
  db_data:
```

### Structure

- `Dockerfile` in service root
- `.dockerignore` next to Dockerfile
- `docker-compose.yml` for local dev
- `docker-compose.prod.yml` for production

## Boundaries

- ✅ **Always:** Multi-stage builds. Separate build + runtime
- ✅ **Always:** Non-root user in final stage
- ✅ **Always:** Pin base image versions (e.g. `oven/bun:1-alpine`)
- ✅ **Always:** Maintain `.dockerignore` (exclude `.git`, `node_modules`, secrets)
- ✅ **Always:** Exec form for `CMD`/`ENTRYPOINT` (`CMD ["bun", "run", "start"]`)
- ✅ **Always:** `HEALTHCHECK` instruction
- ⚠️ **Ask:** Before Alpine vs Debian/Ubuntu base
- ⚠️ **Ask:** Before adding/dropping Linux capabilities
- ⚠️ **Ask:** Volume strategies for stateful services
- 🚫 **Never:** Copy secrets into images
- 🚫 **Never:** Use `latest` tag in production
- 🚫 **Never:** Run as root (UID 0)
- 🚫 **Never:** Include build tools in production image
