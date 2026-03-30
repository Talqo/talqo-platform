<overview>
Bun + Turborepo monorepo (PB138). Each workspace has its own `CLAUDE.md` with workspace-specific structure and conventions.
</overview>
<structure>
```
pb138/
├── apps/
│   ├── api/              # Hono REST API (Bun runtime, Drizzle, Zod)
│   └── web/              # React SPA (Vite + shadcn/ui + Tailwind CSS)
├── packages/
│   ├── db/               # Drizzle schema, client, migrations, DTOs — shared DB types for all apps
│   ├── shared/           # Shared Zod schemas, Zod validators, TypeScript types, and constants
│   └── widget/           # Standalone React component library (public npm package)
└── docs/                 # Project documentation (markdown, mermaid diagrams)
```
</structure>
<important>
- **Bun only** — never use npm/yarn/pnpm.
- **`packages/shared` must build before dependents** — turbo handles this, but if you run a workspace directly and get import errors from `shared`, build it first with `cd packages/shared && bun run build`.
- **Pre-commit hook** runs `bun run check` (Biome). Commit-msg hook runs commitlint.
- **Biome formatting:** tabs, double quotes. Enforced automatically — don't override.
- **`verbatimModuleSyntax`** is enabled — use `import type` for type-only imports.
- **Commit format:** conventional commits (`type(scope): subject`), max 100 char header, no trailing period.
- **Documentation:** inside `docs/`, markdown files, mermaid diagrams. Keep it up to date with code changes.
</important>
