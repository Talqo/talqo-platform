<overview>
Shared types, Zod validators, and constants consumed by both `apps/api` and `apps/web`.
</overview>
<structure>
```
src/
├── types/              # Shared TypeScript types and interfaces
├── constants/          # Shared enums, config values
├── validators/         # Zod schemas for domain logic not tied to DB (e.g., form validation shared between frontend and backend)
└── index.ts            # Barrel export
```
</structure>
<conventions>
- Keep this package dependency-free where possible (types and constants need no runtime deps).
- Zod schemas that derive from the DB schema belong in `packages/db/src/dto/`, not here. This package holds domain validation logic independent of the database.
</conventions>
