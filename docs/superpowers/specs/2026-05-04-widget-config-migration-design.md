# Widget Visual Config Migration — Design Spec

**Date:** 2026-05-04  
**Branch:** SCRUM-117-widget-config-migration  
**Scope:** Move widget visual configuration from client-side embed code into the database. Minimal embed code required from clients.

---

## Problem

Currently, clients must embed a large `window.__AI_WIDGET_CONFIG__` object containing colors, position, bot name, and icons alongside their widget token. This is fragile: config lives in the client's HTML, changes require editing and re-deploying the embed code, and the config is duplicated across every page that embeds the widget.

## Goal

- Widget visual config (colors, position, botName, icons) stored in DB, managed via dashboard
- Embed code shrinks to a single token reference
- Widget fetches its own config at runtime using that token

---

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | `apiUrl` removed from embed config | Bundle uses compiled `VITE_API_URL`; custom apiUrl was unused in practice |
| 2 | New `widget_configs` table | Follows existing pattern (`bot_configs`, `ai_provider_configs`); SRP |
| 3 | Explicit save button on dashboard | Consistent with `BotConfigForm`; avoids partial-save complexity |
| 4 | Fallback to hardcoded defaults on fetch failure | Widget always renders; degraded branding > no widget |
| 5 | HTTP cache (`max-age=3600, stale-while-revalidate=86400`) | No custom cache code; browser handles stale-while-revalidate natively |
| 6 | `Vary: X-Widget-Token` response header | Prevents cache collisions when same browser visits two different clients' sites |
| 7 | `window.__PAGEPAL__ = { token }` | Shorter, branded, object shape stays extensible without breaking changes |

---

## Architecture

### Data Layer — `packages/db`

New table `widget_configs` added to `packages/db/src/schema/client.ts` alongside `botConfigs`:

```ts
export const widgetConfigs = pgTable("widget_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .unique()
    .references(() => clients.id, { onDelete: "cascade" }),
  botName: varchar("bot_name", { length: 255 }).notNull().default("AI Assistant"),
  position: varchar("position", { length: 10 }).notNull().default("right"),
  lightColors: jsonb("light_colors").notNull(),
  darkColors: jsonb("dark_colors").notNull(),
  icons: jsonb("icons").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})
```

New DTO file `packages/db/src/dto/widget-config.dto.ts` — Zod schema + inferred type, exported from `dto/index.ts`.

Migration generated via `bun run db:generate`.

### Shared Schemas — `packages/shared`

New `widgetVisualConfigSchema` — single source of truth for the config shape:

```ts
export const widgetVisualConfigSchema = z.object({
  botName: z.string().max(255).default("AI Assistant"),
  position: z.enum(["left", "right"]).default("right"),
  lightColors: widgetColorsSchema,
  darkColors: widgetColorsSchema,
  icons: widgetIconsSchema,
})
```

Used by:
- API request body validation (`PUT /client/me/widget-config`)
- Dashboard form schema (extended via `zodResolver`)

### API Layer — `apps/api`

#### New module: `apps/api/src/modules/widget-config/`

Shared business logic (repository + service) for both auth contexts:

```
widget-config/
├── widget-config.service.ts       # business logic — no Hono context
├── widget-config.repository.ts    # DB queries; InMemoryWidgetConfigRepository for tests
└── index.ts                       # wires repo → service, exports instances
```

Routes live in the appropriate auth-scoped module:

- **`GET /widget/config`** → added to existing `apps/api/src/modules/widget/widget.routes.ts` (already under `widgetAuth`)
- **`GET /client/me/widget-config`** and **`PUT /client/me/widget-config`** → new `apps/api/src/modules/widget-config/widget-config.client.routes.ts`, mounted under the `/client/me` router (already under `clientAuth`)

**Repository** — `findByClientId` and `upsert` by clientId.

**Service** — merges DB result with hardcoded defaults (response always has all fields even when no row exists yet).

#### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/widget/config` | `X-Widget-Token` | Widget fetches its visual config |
| `GET` | `/client/me/widget-config` | JWT | Dashboard loads saved config |
| `PUT` | `/client/me/widget-config` | JWT | Dashboard saves config |

**`GET /widget/config` response headers:**
```
Cache-Control: public, max-age=3600, stale-while-revalidate=86400
Vary: X-Widget-Token
```

- Returns config from DB if row exists; otherwise returns hardcoded defaults
- `max-age=3600` (1 hour fresh) + `stale-while-revalidate=86400` (serve stale up to 24h while refreshing in background)
- `Vary: X-Widget-Token` — browser cache keyed per token, no cross-tenant collisions

**`PUT /client/me/widget-config`:**
- Upserts `widget_configs` row for authenticated client
- Validates body against `widgetVisualConfigSchema`
- Returns saved config

### Widget Init — `packages/widget/src/main.tsx`

`init()` becomes async. Flow:

```
1. Read widgetToken from window.__PAGEPAL__.token
2. fetch(`${VITE_API_URL}/widget/config`, { headers: { "X-Widget-Token": token } })
   — browser HTTP cache handles stale-while-revalidate transparently
3. On failure: use HARDCODED_DEFAULTS
4. injectCSSVariables(config)
5. mountReact(config)
```

No custom localStorage cache — browser HTTP cache with `stale-while-revalidate` covers the use case natively.

**`window.__PAGEPAL__` type augmentation** (replaces `window.__AI_WIDGET_CONFIG__`):

```ts
interface Window {
  __PAGEPAL__?: { token: string }
}
```

**`WidgetConfig` type** (`packages/widget/src/types.ts`) simplified — `apiUrl`, `colors`, `darkColors`, `icons`, `position`, `defaultOpen`, `botName` removed from the public interface. Config is now fetched, not injected. Only `token` required from client.

### Dashboard Changes — `apps/web`

**`WidgetSetup.tsx`:**
- On mount: `useWidgetConfig()` TanStack Query hook → `GET /client/widget-config` → populates form
- Save button: `PUT /client/widget-config` → invalidates `useWidgetConfig` query → toast
- Local state still drives `WidgetPreview` (no round-trip needed for live preview)

**`EmbedCodeCard.tsx`:**
- Drops `colors`, `icons`, `botName`, `position`, `apiUrl` from generated config object
- New embed code:
  ```html
  <script>
    window.__PAGEPAL__ = { "token": "YOUR_TOKEN" };
  </script>
  <script async defer src="...widget-bundle.js"></script>
  ```

**New TanStack Query hook** `useWidgetConfig` in `apps/web/src/api/hooks/` — follows existing hook patterns.

**OpenAPI types regenerated** after API changes via `bun run generate-api`.

---

## Data Flow

```
Dashboard save:
  Client edits config → Save button → PUT /client/widget-config → upsert widget_configs

Widget init:
  Page loads → read window.__PAGEPAL__.token → GET /widget/config
    → [browser cache hit]: return cached, refresh in background
    → [cache miss]:         fetch DB → merge defaults → return + cache headers
  → injectCSSVariables → mountReact
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| `window.__PAGEPAL__` missing or no token | `console.error`, widget does not mount |
| `GET /widget/config` network failure | Fall back to `HARDCODED_DEFAULTS`, mount widget |
| `GET /widget/config` 4xx (invalid token) | Fall back to `HARDCODED_DEFAULTS`, mount widget |
| `PUT /client/widget-config` failure | Toast error in dashboard, config not saved |
| `GET /client/widget-config` failure | Alert in dashboard, form shows defaults |

---

## Requirements Impact

| ID | Requirement | Status after |
|----|-------------|-------------|
| NFR-1.2 | Widget allows visual customization | Done — managed in dashboard, fetched at runtime |
| FR-2.3 | Client can embed widget via script tag | Done — simpler embed code |

No new requirements introduced. Existing functional behavior unchanged.

---

## Out of Scope

- Cache invalidation on token rotation (existing `widgetToken` rotation already invalidates all sessions; new token = new cache key automatically)
- Per-field audit log of config changes
- Config versioning / rollback
