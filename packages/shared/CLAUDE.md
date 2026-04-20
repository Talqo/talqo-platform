# shared

Shared Zod validators and TypeScript types consumed by `apps/api` and `apps/web`. Built via `tsgo` — consumers import from the compiled `dist/`.

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

- Only runtime dependency is `zod`. Do not add others — types and constants need no runtime deps.
- `export type *` (not `export *`) is used in `index.ts` for the types barrel — required by `verbatimModuleSyntax`.
- Naming: auth-style schemas use PascalCase + `Schema` suffix (`RegisterSchema`); API body/query schemas use camelCase + `Schema` suffix (`updateBotConfigBodySchema`). Follow whichever matches the file's existing style.
- Inferred input types (`z.infer<typeof SomeSchema>`) are co-located in the same file as their schema, not in `types/`.
- Zod schemas derived from DB schema belong in `packages/db/src/dto/`, not here. This package holds domain validation independent of the database.
- `openai_compatible` is the only provider type that requires `baseUrl` — enforced via discriminated union in `provider-config.ts`.
