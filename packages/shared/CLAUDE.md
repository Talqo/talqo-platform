# shared

Shared Zod validators and TypeScript types consumed by `apps/api` and `apps/web`. Built via `tsgo` — consumers import from compiled `dist/`.

## Structure

```
src/
├── types/
│   ├── agent.ts        # AiProviderConfig, McpServerConfig, ProviderType unions
│   └── index.ts        # ApiResponse + re-exports from agent.ts
├── validators/
│   ├── common.ts       # uuidParamSchema, paginationQuerySchema
│   ├── auth.ts         # Register/Login/ForgotPassword/ResetPassword schemas + inferred types
│   ├── bot-config.ts   # updateBotConfigBodySchema
│   ├── provider-config.ts  # upsertProviderConfigBodySchema (discriminated union on providerType)
│   ├── mcp.ts          # mcpConfigBodySchema
│   ├── files.ts        # file path/move/upload/presign schemas (path-traversal guards built in)
│   ├── widget.ts       # createSession, rateConversation, sendMessage schemas
│   ├── analytics.ts    # analyticsQuerySchema
│   ├── admin.ts        # clientStatusUpdateSchema
│   ├── client-account.ts  # updateProfile, changePassword, addFunds, usageLimit, usageAlert
│   ├── blacklist.ts    # addWordBodySchema
│   └── index.ts        # barrel
└── index.ts            # export type * from types; export * from validators
```

## Conventions

- Only runtime dependency is `zod`. Do not add others — types and constants need no runtime deps
- **String validators must have both `.min()` and `.max()`** — omitting `.max()` allows unbounded DB writes and DoS via expensive operations (e.g. Argon2, LLM tokens)
- **Domain unions/enums are defined once here, never duplicated** — consuming packages import from here, never redefine
- `export type *` (not `export *`) used in `index.ts` for types barrel — required by `verbatimModuleSyntax`
- Naming: auth-style schemas use PascalCase + `Schema` suffix (`RegisterSchema`); API body/query schemas use camelCase + `Schema` suffix (`updateBotConfigBodySchema`). Follow whichever matches file's existing style
- Inferred input types (`z.infer<typeof SomeSchema>`) co-located in same file as schema, not in `types/`
- Zod schemas derived from DB schema belong in `packages/db/src/dto/`, not here. This package holds domain validation independent of database
- `openai_compatible` is only provider type requiring `baseUrl` — enforced via discriminated union in `provider-config.ts`
