# Talqo

Bun + Turborepo monorepo. Each workspace owns `CLAUDE.md`.

## Structure

```
talqo/
├── apps/
│   ├── api/              # Hono REST API (Bun, Drizzle, Zod)
│   └── web/              # React SPA (Vite + shadcn/ui + Tailwind)
├── packages/
│   ├── db/               # Drizzle schema, client, migrations, DTOs
│   ├── shared/           # Shared Zod schemas, validators, TS types
│   └── widget/           # Standalone chat widget — IIFE bundle, private
└── docs/                 # Project docs (markdown, mermaid)
```

## Key constraints

- **Bun only** — never npm/yarn/pnpm
- **`packages/shared` must build before dependents** — turbo handles. Import errors from `shared`? Build first: `cd packages/shared && bun run build`
- **`packages/db` must build before dependents** — turbo handles. Import errors from `db`? Build first: `cd packages/db && bun run build`
- **Pre-commit hook** runs `lint-staged` (Biome on staged files). Commit-msg hook runs commitlint
- **`verbatimModuleSyntax`** enabled — use `import type` for type-only imports
- **Commit format:** conventional commits (`type(scope): subject`), max 100 char header, no trailing period. Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`, `perf`, `ci`, `revert`
- **Reuse over duplication** — before creating a new component, hook, or utility, check if a suitable shared abstraction already exists. Prefer extending existing shadcn/ui primitives or domain-specific shared components (e.g., `ConfirmDialog`) over copy-pasting markup. If a pattern appears three or more times, extract it.

## Biome formatting (auto-enforced, no override)

Tabs, double quotes, no semicolons, trailing commas, line width 80. `components/ui/` and `*.gen.ts` excluded from lint.

## Requirements tracking

`docs/requirements.md` = source of truth. Each requirement has `Completion`: `Not started`, `In progress`, `Done`.

**Rules for every session touching feature code or bug fixes:**

1. Read `docs/requirements.md` at start.
2. After work, identify affected requirement IDs. Update `Completion`:
   - `In progress` — partial impl or not end-to-end reachable
   - `Done` — full behavior implemented and reachable by end user. No partial implementations
3. Code implements untracked feature? Tell dev: "New feature not tracked in `docs/requirements.md`. Add requirement before or after implementing."
4. Never silently skip requirements update — part of definition of done.

## Feedback loop

Run after changes:

```bash
bun run fix
bun run type-check
bun run test
bun run test:integration
make e2e
```

