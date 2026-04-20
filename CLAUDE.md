# PagePal project overview

Bun + Turborepo monorepo. Each workspace has its own `CLAUDE.md` with workspace-specific structure and conventions.

## Structure

```
pagepal/
├── apps/
│   ├── api/              # Hono REST API (Bun runtime, Drizzle, Zod)
│   └── web/              # React SPA (Vite + shadcn/ui + Tailwind CSS)
├── packages/
│   ├── db/               # Drizzle schema, client, migrations, DTOs — shared DB types for all apps
│   ├── shared/           # Shared Zod schemas, validators, and TypeScript types
│   └── widget/           # Standalone chat widget — IIFE bundle, private (not npm)
└── docs/                 # Project documentation (markdown, mermaid diagrams)
```

## Key constraints

- **Bun only** — never use npm/yarn/pnpm.
- **`packages/shared` must build before dependents** — turbo handles this, but if you run a workspace directly and get import errors from `shared`, build it first: `cd packages/shared && bun run build`.
- **Pre-commit hook** runs `lint-staged` (Biome on staged files only). Commit-msg hook runs commitlint.
- **`verbatimModuleSyntax`** is enabled — use `import type` for type-only imports.
- **Commit format:** conventional commits (`type(scope): subject`), max 100 char header, no trailing period. Allowed types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`, `perf`, `ci`, `revert`.

## Biome formatting (auto-enforced, don't override)

Tabs, double quotes, no semicolons, trailing commas, line width 80. `components/ui/` and `*.gen.ts` files are excluded from linting.

## Requirements tracking

`docs/requirements.md` is the source of truth for what this project must do. Every requirement has a `Completion` column with one of three values: `Not started`, `In progress`, `Done`.

**Rules for every session that touches feature code or bug fixes:**

1. Read `docs/requirements.md` at the start of the session.
2. After finishing work, identify which requirement IDs were affected. Update their `Completion` field:
   - `In progress` — feature partially implemented or not yet reachable end-to-end.
   - `Done` — full behaviour is implemented and reachable by an end user; do not use this for partial work.
3. If the code implements something not covered by any existing requirement, tell the developer: _"This appears to be a new feature not tracked in `docs/requirements.md`. Add it as a new requirement before or after implementing it."_
4. Never silently skip the requirements update — it is part of the definition of done for every task.
