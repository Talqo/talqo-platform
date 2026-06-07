# API

REST API built with Hono on Bun. Uses `@hono/zod-openapi` (not plain Hono) — all routes defined via `createRoute` + `OpenAPIHono` for auto-generated OpenAPI spec.

## Structure

Feature-based — group by domain, not by layer. Flow: `routes → service → repository → DB`.

```
src/
├── app.ts          # Creates OpenAPIHono app, mounts all routes, global middleware
├── index.ts        # Bun server entry — exports { port, fetch }
├── common/
│   ├── config.ts   # Env parsing via Zod — fails fast at startup if invalid
│   ├── errors.ts   # AppError subclasses (throw, don't return JSON)
│   ├── jwt.ts      # signToken / verifyToken — jose, HS256
│   ├── crypto.ts   # AES-256-GCM encrypt/decrypt for provider API keys at rest
│   ├── logger.ts   # Structured logger — never use console.*
│   ├── schemas.ts  # successResponseSchema / errorResponseSchema helpers
│   └── middleware/ # clientAuth, widgetAuth, adminAuth, wideEvent, errorHandler, widgetRateLimit, adminAuditLog
├── db/
│   └── index.ts    # Local Drizzle client (re-exports schema from packages/db)
└── modules/<feature>/
    ├── <feature>.routes.ts     # createRoute + OpenAPIHono router, exports named route consts
    ├── <feature>.service.ts    # Business logic — no Hono context, no DB access
    ├── <feature>.repository.ts # Drizzle queries; also exports InMemoryRepository for tests
    ├── <feature>.test.ts       # Tests co-located with feature
    └── index.ts                # Wires repo → service, re-exports routes and service
```

## Key conventions

- **Errors: throw, never return JSON** — throw an `AppError` subclass from `src/common/errors.ts`; `errorHandler` converts it to `{ error: { code, message } }`. Never call `c.json({ error: ... })` directly — it bypasses Sentry capture and structured logging.
- **Read env vars from `config` (`src/common/config.ts`)**, never from `process.env` directly — `config` is Zod-validated at startup; `process.env` bypasses that guarantee
- **When a repository has multiple implementations (Drizzle + InMemory), define a shared `type XRepository = { ... }` and have both classes implement it** — this lets TypeScript catch type mismatches between implementations, and lets services declare `constructor(repo: XRepository)` to accept either. Repositories with only a Drizzle class do not need a shared type. No `I` prefix on type names.
- **Response shape** — always use `successResponseSchema` / `errorResponseSchema` from `src/common/schemas.ts` for OpenAPI response definitions
- **Services are framework-agnostic** — no `c` (Hono context), no Drizzle imports
- **Repositories own all queries** — services never import Drizzle or run SQL

## Auth layers

| Middleware | Header | Protects |
|---|---|---|
| `clientAuth` | `Authorization: Bearer <JWT>` | `/client/*` |
| `widgetAuth` | `X-Widget-Token: <token>` | `/widget/*` |
| `adminAuth` | `Authorization: Bearer <JWT>` | `/admin/*` (except `/admin/auth`) |

- JWT payload: `{ sub, role: "client"|"admin", imp?: true }` — `imp` marks admin impersonation tokens
- `clientId` / `adminId` set on Hono context by auth middleware; read via `c.get("clientId")`
- Per-request logger with `requestId` injected globally: `c.get("logger")`

## Testing

### Unit Tests (`*.test.ts`)
- Tests use `app.request()` directly — no real server needed
- Repositories export `InMemoryRepository` alongside Drizzle implementation; tests wire in-memory variant
- Mocks must be declared **before** dynamic `await import(...)` due to Bun module caching order
- Config auto-provides safe defaults in test env (`NODE_ENV=test` or `BUN_TEST=1`) — no `.env` required

### Integration Tests (`*.integration.ts`)
- Use the real `OpenAPIHono` app from `@/app` with real DB + real middleware
- Mock external services only (Resend, AI providers, S3) using `mock.module()` at file scope
- Use raw SQL for DB cleanup in `afterAll` — do NOT import repositories (avoids importing the mocked module when running alongside unit tests)
- Set required env vars in `beforeAll` before dynamic `import("@/app")`
- Timeout: 30s (`bun test --timeout 30000`)

## Logging

Use `src/common/logger.ts` (never `console.*`). Output is NDJSON.

Each request emits one structured `"wide_event"` log line via `wideEventMiddleware` (registered globally in `app.ts`). Do not log HTTP request/response fields in routes — they are captured automatically. Enrich the wide event with domain context instead:

```ts
const wideEvent = c.get("wideEvent")
wideEvent.widget = { session_id: session.id }
```

See `src/common/wide-event.types.ts` for the full event shape and `docs/logging.md` for field reference. Rethrow unhandled errors so `errorHandler` logs them.

## OpenAPI / docs

- Spec auto-generated at `GET /openapi.json`; Scalar UI at `GET /docs`
- Security schemes registered in `app.ts`: `bearerAuth` (JWT) and `widgetToken` (API key header)

## AI / agent

- `src/modules/agent/` uses Vercel AI SDK (`ai` package) with `generateText` and `streamText` for synchronous and streaming responses
- Provider API keys stored AES-256-GCM encrypted (`src/common/crypto.ts`); `PROVIDER_KEY_SECRET` must be 64-hex-char non-trivial value
- MCP server connections opened per-request and closed in `finally` block
