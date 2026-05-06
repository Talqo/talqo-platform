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
    ├── <feature>.routes.ts     # createRoute + OpenAPIHono factory function
    ├── <feature>.service.ts    # Business logic — no Hono context, no DB access
    ├── <feature>.repository.ts # Drizzle queries; also exports InMemoryRepository for tests
    ├── <feature>.test.ts       # Tests co-located with feature
    └── index.ts                # Wires repo → service → router, exports named route const
```

## Key conventions

- **Routes are factory functions** — `createAuthRouter(service)` — wired in `index.ts`, not directly imported
- **Throw `AppError` subclasses** from `src/common/errors.ts`; `errorHandler` middleware converts to `{ error: { code, message } }`. Never build error JSON manually in routes
- **Available error classes:** `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` / `AuthConflictError` (409), `ValidationError` (422), `BadRequestError` (400, needs code string), `TooManyRequestsError` (429)
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

- Tests use `app.fetch()` directly — no real server needed
- Repositories export `InMemoryRepository` alongside Drizzle implementation; tests wire in-memory variant
- Mocks must be declared **before** dynamic `await import(...)` due to Bun module caching order
- Config auto-provides safe defaults in test env (`NODE_ENV=test` or `BUN_TEST=1`) — no `.env` required

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
