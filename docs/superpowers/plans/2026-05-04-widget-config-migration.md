# Widget Config Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move widget visual configuration (colors, position, botName, icons) from client-side embed code into the database; widget fetches config at runtime using only a `widgetToken`.

**Architecture:** New `widget_configs` DB table (1:1 with clients); new API endpoints for widget fetch (`GET /widget/config`) and dashboard CRUD (`GET/PUT /client/me/widget-config`); widget `init()` becomes async and fetches config via HTTP (browser-cached via `Cache-Control` + `Vary` headers); embed code shrinks to `window.__PAGEPAL__ = { token: "..." }`.

**Tech Stack:** Drizzle ORM (JSONB columns), Hono + zod-openapi, TanStack Query (dashboard), React (widget), Bun, Biome.

**Spec:** `docs/superpowers/specs/2026-05-04-widget-config-migration-design.md`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `packages/shared/src/validators/widget.ts` | Modify | Add `widgetColorsSchema`, `widgetIconsSchema`, `widgetVisualConfigSchema` |
| `packages/db/src/schema/client.ts` | Modify | Add `widgetConfigs` table |
| `packages/db/src/schema/index.ts` | Modify | Export `widgetConfigs` |
| `packages/db/src/dto/widget-config.dto.ts` | Create | Response schema + types for widget config |
| `packages/db/src/dto/index.ts` | Modify | Export new DTO |
| `apps/api/src/modules/widget-config/widget-config.repository.ts` | Create | `findByClientId`, `upsert` |
| `apps/api/src/modules/widget-config/widget-config.service.ts` | Create | `getConfig` (merges defaults), `saveConfig` |
| `apps/api/src/modules/widget-config/widget-config.client.routes.ts` | Create | `GET/PUT /client/me/widget-config` routes |
| `apps/api/src/modules/widget-config/widget-config.test.ts` | Create | Service + route tests |
| `apps/api/src/modules/widget-config/index.ts` | Create | Wire repo → service; export `widgetConfigService` and `widgetConfigClientRoutes` |
| `apps/api/src/modules/widget/widget.routes.ts` | Modify | Add `widgetConfigRoutes` with `GET /config` route and cache headers |
| `apps/api/src/app.ts` | Modify | Mount new client widget-config routes |
| `packages/widget/src/types.ts` | Modify | Simplify `WidgetConfig` to `{ token: string }`; rename global |
| `packages/widget/src/main.tsx` | Modify | Async `init()`, fetch config from API, fallback to defaults |
| `apps/web/src/api/generated/` | Regenerate | `bun run generate-api` after API changes |
| `apps/web/src/api/hooks/useWidgetConfig.ts` | Create | `useWidgetConfig` + `useUpdateWidgetConfig` hooks |
| `apps/web/src/api/hooks/index.ts` | Modify | Export new hook |
| `apps/web/src/components/widget/WidgetSetup.tsx` | Modify | Load config from API on mount; add save button |
| `apps/web/src/components/widget/setup/EmbedCodeCard.tsx` | Modify | Simplify embed code to `window.__PAGEPAL__ = { token }` |
| `docs/requirements.md` | Modify | Update NFR-1.2, FR-2.3 completion status |

---

## Task 1: Shared — widget visual config schemas

**Files:**
- Modify: `packages/shared/src/validators/widget.ts`

- [ ] Add `widgetColorsSchema` — object with the 10 color string fields matching `WidgetColors` in the widget package (`primary`, `bgPrimary`, `bgSecondary`, `textPrimary`, `textSecondary`, `border`, `headerTitleText`, `userMessageText`, `sendButtonIcon`, `footerText`). All `z.string()`.

- [ ] Add `widgetIconsSchema` — `z.object({ botAvatar: z.string() })`.

- [ ] Add `widgetVisualConfigSchema` — combines both color schemas plus `botName` (`z.string().max(255).default("AI Assistant")`), `position` (`z.enum(["left", "right"]).default("right")`), `lightColors: widgetColorsSchema`, `darkColors: widgetColorsSchema`, `icons: widgetIconsSchema`.

- [ ] Export all three from `packages/shared/src/validators/index.ts` (barrel already at `src/validators/index.ts`).

- [ ] Build shared: `cd packages/shared && bun run build`. Confirm no errors.

- [ ] Commit: `feat(shared): add widget visual config schemas`

---

## Task 2: DB schema — widget_configs table

**Files:**
- Modify: `packages/db/src/schema/client.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] Add `widgetConfigs` pgTable to `client.ts` alongside the existing `botConfigs` table. Columns: `id` (uuid PK), `clientId` (uuid unique FK→clients cascade delete), `botName` (varchar 255, not null, default `"AI Assistant"`), `position` (varchar 10, not null, default `"right"`), `lightColors` (jsonb, not null), `darkColors` (jsonb, not null), `icons` (jsonb, not null), `updatedAt` (timestamp with tz, defaultNow, not null).

- [ ] Export `widgetConfigs` from `packages/db/src/schema/index.ts`.

- [ ] Run `bun run db:generate` from `packages/db/` to generate the SQL migration. Verify the generated file in `drizzle/` looks correct (new table, no destructive changes).

- [ ] Commit: `feat(db): add widget_configs table`

---

## Task 3: DB DTO — widget config response schema

**Files:**
- Create: `packages/db/src/dto/widget-config.dto.ts`
- Modify: `packages/db/src/dto/index.ts`

- [ ] In the new DTO file, use `createSelectSchema(widgetConfigs, { ... })` from `drizzle-zod`. Override `updatedAt` to `z.string()` (timestamp comes back as string from postgres-js). JSONB columns (`lightColors`, `darkColors`, `icons`) type as `z.unknown()` initially — the widget schema from `shared` will validate the shape at the API layer.

- [ ] Export `widgetConfigResponseSchema` and inferred `type WidgetConfigResponse`.

- [ ] Add `export * from "./widget-config.dto"` to `packages/db/src/dto/index.ts`.

- [ ] Build db package: `cd packages/db && bun run build`. Confirm no errors.

- [ ] Commit: `feat(db): add widget config DTO`

---

## Task 4: API — widget-config repository and service

**Files:**
- Create: `apps/api/src/modules/widget-config/widget-config.repository.ts`
- Create: `apps/api/src/modules/widget-config/widget-config.service.ts`

- [ ] **Repository** (`widget-config.repository.ts`): Class `WidgetConfigRepository` with constructor `(db: DB)`. Two methods:
  - `findByClientId(clientId: string)` — select from `widgetConfigs` where `clientId` matches, return first row or null.
  - `upsert(clientId: string, data: WidgetConfigData)` — insert with `onConflictDoUpdate` on `clientId`, sets all color/icon/name/position fields + `updatedAt: new Date()`. Returns the row.
  
  Also export `InMemoryWidgetConfigRepository` implementing the same interface — stores a `Map<clientId, row>` for use in tests.

- [ ] **Service** (`widget-config.service.ts`): Class `WidgetConfigService` with constructor taking the repository interface. Two methods:
  - `getConfig(clientId: string)` — calls `findByClientId`; if null, returns hardcoded defaults (same defaults as the widget bundle's `DEFAULT_COLORS` + `defaultIcons` + `position: "right"` + `botName: "AI Assistant"`). Does **not** create a row — row only created on first explicit save.
  - `saveConfig(clientId: string, data)` — calls `upsert`, returns saved row.

- [ ] Write tests in `widget-config.test.ts`:
  - `getConfig` with no row → returns defaults with correct shape
  - `getConfig` with existing row → returns row data
  - `saveConfig` → upserts and returns updated data
  - Use `InMemoryWidgetConfigRepository` in all tests

- [ ] Run tests: `bun test apps/api/src/modules/widget-config/widget-config.test.ts`

- [ ] Commit: `feat(api): add widget-config repository and service`

---

## Task 5: API — GET /widget/config route

**Files:**
- Modify: `apps/api/src/modules/widget/widget.routes.ts`
- Create: `apps/api/src/modules/widget-config/index.ts`

- [ ] In `widget-config/index.ts`, wire `WidgetConfigRepository(db)` → `WidgetConfigService`, export `widgetConfigService`. Also export `widgetConfigClientRoutes` (defined in Task 6) from here.

- [ ] In `widget.routes.ts`, create a new `export const widgetConfigRoutes = new OpenAPIHono()`. Add `openapi` route: `GET /config`, security `widgetToken`, tag `Widget`. Handler reads `clientId` from context (set by `widgetAuth` middleware), calls `widgetConfigService.getConfig(clientId)` (import from `widget-config/index.ts`), sets response headers `Cache-Control: public, max-age=3600, stale-while-revalidate=86400` and `Vary: X-Widget-Token`, returns config JSON.

- [ ] Export `widgetConfigRoutes` from `apps/api/src/modules/widget/index.ts` alongside the existing route exports.

- [ ] In `app.ts`, import `widgetConfigRoutes` from the widget module and add `app.route("/widget", widgetConfigRoutes)` in the widget section (it mounts at `/widget/config` since the route path is `/config`).

- [ ] Verify the widget module compiles: `cd apps/api && bun run type-check`.

- [ ] Add an integration test in `widget-config.test.ts` (or a new `widget.config.test.ts`) for `GET /widget/config`:
  - With valid token → 200 + correct shape + `Cache-Control` header present
  - With invalid token → 401

- [ ] Run tests: `bun test apps/api/src/modules/widget`

- [ ] Commit: `feat(api): add GET /widget/config endpoint with HTTP cache headers`

---

## Task 6: API — client widget-config routes

**Files:**
- Create: `apps/api/src/modules/widget-config/widget-config.client.routes.ts`
- Modify: `apps/api/src/app.ts`

- [ ] Create `widget-config.client.routes.ts` — `OpenAPIHono` router with two routes:
  - `GET /` — tag `Widget Config`, security `bearerAuth`. Returns `widgetConfigService.getConfig(clientId)`.
  - `PUT /` — tag `Widget Config`, security `bearerAuth`, request body validated against `widgetVisualConfigSchema` from `shared`. Calls `widgetConfigService.saveConfig(clientId, body)`. Returns saved config.

- [ ] Export `widgetConfigClientRoutes` from the module's `index.ts`.

- [ ] In `app.ts`, import `widgetConfigClientRoutes` and mount: `app.route("/client/me/widget-config", widgetConfigClientRoutes)`. Add `"Widget Config"` to the tags array in the OpenAPI doc block.

- [ ] Add integration tests in `widget-config.test.ts`:
  - `GET /client/me/widget-config` with valid JWT → 200 + defaults when no row
  - `PUT /client/me/widget-config` with valid body → 200 + saved data
  - `GET /client/me/widget-config` after PUT → returns saved data
  - `PUT /client/me/widget-config` with invalid body (bad color key) → 422

- [ ] Run all widget-config tests: `bun test apps/api/src/modules/widget-config`

- [ ] Run full API type-check: `cd apps/api && bun run type-check`

- [ ] Commit: `feat(api): add GET/PUT /client/me/widget-config endpoints`

---

## Task 7: Widget — async init and simplified config type

**Files:**
- Modify: `packages/widget/src/types.ts`
- Modify: `packages/widget/src/main.tsx`

- [ ] In `types.ts`:
  - Remove `WidgetConfig` (the old full config type with colors/icons/etc.)
  - Add `PagePalConfig = { token: string }` — the only thing clients provide
  - Keep `WidgetColors`, `WidgetIcons`, `ResolvedWidgetConfig` — these are still used internally for the fetched config shape
  - Update the global Window augmentation: `__PAGEPAL__?: PagePalConfig` (remove `__AI_WIDGET_CONFIG__`)

- [ ] In `main.tsx`:
  - Remove `resolveColors`, `resolveDarkColors`, `resolveConfig` functions
  - Add `HARDCODED_DEFAULTS: ResolvedWidgetConfig` constant at module level — same values as old `DEFAULT_COLORS` plus `position: "right"`, `defaultOpen: false`, `botName: "AI Assistant"`, `icons: { botAvatar: "bot" }`
  - Add async `fetchWidgetConfig(token: string): Promise<ResolvedWidgetConfig>` — fetches `${import.meta.env.VITE_API_URL}/widget/config` with `X-Widget-Token: token` header; parses JSON; returns typed config; on any error returns `HARDCODED_DEFAULTS`
  - Make `init()` async:
    1. Read `window.__PAGEPAL__?.token`; if missing throw/log error and return
    2. `const config = await fetchWidgetConfig(token)`
    3. `trackPageview` (already fire-and-forget, adapt to use token instead of full config)
    4. `injectCSSVariables(config)` — unchanged
    5. `mountReact(config)` — unchanged
  - Update `trackPageview` to accept `{ token: string, apiUrl: string }` rather than full `ResolvedWidgetConfig`

- [ ] Build widget: `cd packages/widget && bun run build`. Fix any type errors.

- [ ] Test manually in dev: `bun run dev` — confirm widget loads with fetched config (requires local API running with a valid token).

- [ ] Commit: `feat(widget): async init with DB config fetch, rename global to __PAGEPAL__`

---

## Task 8: Dashboard — regenerate API types and add useWidgetConfig hook

**Files:**
- Regenerate: `apps/web/src/api/generated/` (via `bun run generate-api`)
- Create: `apps/web/src/api/hooks/useWidgetConfig.ts`
- Modify: `apps/web/src/api/hooks/index.ts`

- [ ] Start the API server (`cd apps/api && bun run dev`) then run `cd apps/web && bun run generate-api`. Confirm `apps/web/src/api/generated/` is updated with new paths for `/widget/config` and `/client/me/widget-config`.

- [ ] Create `useWidgetConfig.ts` following the same pattern as `useBotConfig.ts`:
  - `useWidgetConfig()` — `useQuery` on `GET /client/me/widget-config`, queryKey `["widget-config"]`
  - `useUpdateWidgetConfig()` — `useMutation` on `PUT /client/me/widget-config`, invalidates `["widget-config"]` on success

- [ ] Export both from `apps/web/src/api/hooks/index.ts`.

- [ ] Run web type-check: `cd apps/web && bun run type-check`. Fix any type errors.

- [ ] Commit: `feat(web): add useWidgetConfig hook`

---

## Task 9: Dashboard — WidgetSetup loads from and saves to DB

**Files:**
- Modify: `apps/web/src/components/widget/WidgetSetup.tsx`

- [ ] Import `useWidgetConfig` and `useUpdateWidgetConfig` hooks.

- [ ] Replace the current hardcoded initial state (`useState(defaultColors)` etc.) with state initialized from the query result. Use `useEffect` to sync fetched data into local state when the query resolves (so the live preview still works off local state).

- [ ] Add a "Save" button (place it at the bottom of the configuration panel, before `EmbedCodeCard`). On click, call `useUpdateWidgetConfig` mutation with current local state. Show a loading spinner while saving. On success, show a toast ("Widget config saved"). On error, show a destructive toast.

- [ ] Show a loading skeleton (or disable form inputs) while `useWidgetConfig` is loading.

- [ ] Show an `Alert` (destructive) if `useWidgetConfig` errors — same pattern as the existing error alert in `WidgetSetup.tsx`.

- [ ] Run web type-check: `cd apps/web && bun run type-check`.

- [ ] Commit: `feat(web): load and save widget config from DB in WidgetSetup`

---

## Task 10: Dashboard — simplify EmbedCodeCard

**Files:**
- Modify: `apps/web/src/components/widget/setup/EmbedCodeCard.tsx`

- [ ] Remove props: `position`, `colors`, `icons`, `botName` from `EmbedCodeCardProps`.

- [ ] Update `WidgetSetup.tsx` to stop passing those props to `EmbedCodeCard`.

- [ ] Update `configObject` in `EmbedCodeCard` to only include `token: widgetToken` (rename field from `widgetToken` to `token`).

- [ ] Update the generated embed code block to use `window.__PAGEPAL__` instead of `window.__AI_WIDGET_CONFIG__`.

- [ ] Run web type-check: `cd apps/web && bun run type-check`.

- [ ] Run full feedback loop from `CLAUDE.md`:
  ```
  bun run check --write --unsafe
  bun run type-check
  bun run test
  ```

- [ ] Commit: `feat(web): simplify embed code to window.__PAGEPAL__ token only`

---

## Task 11: Requirements doc update

**Files:**
- Modify: `docs/requirements.md`

- [ ] Update `NFR-1.2` Completion to `Done`.
- [ ] Update `FR-2.3` Completion to `Done` (embed code is now simpler, still script-tag based).

- [ ] Commit: `docs: update requirements completion for NFR-1.2 and FR-2.3`

---

## Dependency Order

```
Task 1 (shared schemas)
  └── Task 2 (DB schema)
        └── Task 3 (DB DTO)
              └── Task 4 (API repo + service)
                    ├── Task 5 (GET /widget/config)
                    └── Task 6 (client routes)
                          └── Task 7 (widget init) — can run in parallel with Tasks 8-10
                                └── Task 8 (generate API types + hook)
                                      └── Task 9 (WidgetSetup)
                                            └── Task 10 (EmbedCodeCard)
                                                  └── Task 11 (requirements)
```
