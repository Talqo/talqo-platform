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
