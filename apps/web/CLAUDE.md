<overview>
React SPA with Vite, TanStack Router, TanStack Query, shadcn/ui, and Tailwind CSS.
</overview>
<structure>
```
src/
├── main.tsx                        # Entry point
├── router.tsx                      # TanStack Router instance and configuration
├── routeTree.gen.ts                # Auto-generated route tree (do not edit)
├── routes/                         # TanStack Router file-based routes
│   ├── __root.tsx                  # Root layout — app shell, nav, providers, error boundary
│   ├── index.tsx                   # / (home page)
│   ├── _authenticated.tsx          # Layout route for auth-protected pages (no URL segment)
│   ├── _authenticated/
│   │   └── dashboard.tsx           # /dashboard
│   └── login.tsx                   # /login
├── components/
│   ├── ui/                         # shadcn/ui generated components (do not edit)
│   └── <feature>/                  # Feature-specific composed components (e.g., UserAvatar.tsx)
├── hooks/                          # Custom React hooks
├── api/
│   └── generated/                  # Auto-generated OpenAPI client (do not edit)
├── lib/
│   └── utils.ts                    # Utility functions (cn() helper, etc.)
├── types/                          # Frontend-specific types not covered by shared or db packages
└── assets/                         # Static assets
```
</structure>
<routing>
- **File-based routing** — TanStack Router generates `routeTree.gen.ts` from `src/routes/`. Never edit this file.
- **Layout routes** use the `_prefix` convention (e.g., `_authenticated.tsx`) — no URL segment.
- **Route params and search params** — validate with Zod schemas using `validateSearch`.
- Lazy loading: use `.lazy.tsx` suffix for code-split routes.
</routing>
<data_fetching>
- **API client is auto-generated** from the backend's OpenAPI spec into `src/api/generated/`. Never edit — regenerate when the spec changes.
- Use `useQuery` and `useMutation` directly in components with the generated client functions.
</data_fetching>
<file_naming>
| File type | Convention | Example |
|-----------|-----------|---------|
| React components | PascalCase | `UserAvatar.tsx`, `DashboardLayout.tsx` |
| Hooks | camelCase with `use` prefix | `useAuth.ts`, `useDebounce.ts` |
| Utilities / lib | camelCase | `utils.ts`, `queryClient.ts` |
| Route files | TanStack convention (lowercase) | `__root.tsx`, `index.tsx`, `_authenticated.tsx` |
| shadcn/ui components | kebab-case (generated, don't rename) | `button.tsx`, `dialog.tsx` |
</file_naming>
<conventions>
- Add shadcn/ui components via `bunx shadcn@latest add <component>`. Do not manually edit `src/components/ui/`.
- Feature components go in `src/components/<feature>/`, not in `src/routes/`. Route files should be thin — compose components, define loaders, handle search params.
- See `.claude/rules/react.md` for React-specific coding conventions.
</conventions>
