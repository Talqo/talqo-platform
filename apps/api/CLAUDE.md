<overview>
REST API built with Hono (https://hono.dev/llms.txt) running on Bun. Uses Drizzle ORM for data access and Zod for request/response validation.
</overview>

<structure>
Feature-based organization — group by domain, not by layer.

Flow: `routes → service → repository → DB`

```
src/
├── app.ts                              # Creates Hono app, mounts module routes, registers global middleware
├── server.ts                           # Starts HTTP server (Bun native server interface)
├── modules/                            # Feature modules grouped by domain
│   └── <feature>/
│       ├── <feature>.routes.ts         # Hono route handlers — parse request, validate with Zod, call service, return response
│       ├── <feature>.service.ts        # Business logic — framework-agnostic, no direct DB or HTTP access
│       ├── <feature>.repository.ts     # Data access — Drizzle queries, pagination, filtering
│       ├── <feature>.test.ts           # Tests co-located with the feature
│       └── index.ts                    # Barrel export (re-exports routes and types)
└── common/
    ├── middleware/                     # Hono middleware (auth, error handling, logging)
    └── config/                         # Environment parsing, app config
```
</structure>

<conventions>
- **No controller layer** — Hono has no controller pattern. The route handler IS the HTTP layer.
- Services are framework-agnostic (no Hono context, no direct DB access).
- Repositories encapsulate all Drizzle queries. Services call repositories, never run queries directly.
- Tests use `app.fetch()` directly — no real server needed.
</conventions>
