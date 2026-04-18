# packages/db

Shared schema and DTOs. Only `apps/api` holds a live DB client — this package contains no runtime connection logic.

## Structure

```
src/
├── schema/      # Drizzle pgTable definitions — one file per domain, barrel-exported from index.ts
└── dto/         # drizzle-zod derived Zod schemas + inferred TypeScript types — one file per domain
drizzle/         # Generated SQL migrations — never edit manually
drizzle.config.ts
migrate.ts       # Standalone migration runner (bun --env-file=../../.env migrate.ts)
```

## Three named exports

`package.json` exposes three entry points: `db` (everything), `db/schema`, `db/dto`. Import from the narrowest one appropriate.

## Schema conventions

- `pgEnum` values are defined alongside the table that owns them (see `client.ts`).
- Monetary columns use `numeric` with `{ precision: 12, scale: 4 }` — they come back as strings from postgres-js; DTOs reflect this with `z.string()`.
- All timestamps use `{ withTimezone: true }`.
- Cascade deletes (`onDelete: "cascade"`) are set on FK columns that are child-owned records.

## DTO conventions

- Use `createSelectSchema` / `createInsertSchema` from `drizzle-zod`, then override individual fields where Zod v4 compatibility requires explicit types (e.g. timestamps → `z.string()`, nullable numerics → `z.string().nullable()`).
- Response schemas always omit sensitive fields (`passwordHash`, `apiKeyEncrypted`) and add masked variants when needed.
- Export both the Zod schema and the inferred `type` from each DTO file.

## Migration workflow

```bash
bun run db:generate   # drizzle-kit generate — creates SQL in drizzle/
bun run db:migrate    # runs migrate.ts against DB from ../../.env
bun run db:push       # schema push without migration files (dev only)
```

Env vars required: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`.

## Build

This package must be built (`bun run build`) before dependent workspaces can import from it. Turbo handles this in normal monorepo runs; run manually only when working in isolation.
