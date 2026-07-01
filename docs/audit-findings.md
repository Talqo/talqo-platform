# Codebase Audit Findings

10 confirmed issues ranked by severity. Found via multi-angle static analysis (June 2026).

---

## 1. `packages/db/CLAUDE.md` incorrectly listed `widgetToken` as a field to omit

**File:** `packages/db/CLAUDE.md`  
**Severity:** Documentation — ❌ Regressed

`CLAUDE.md` stated "Response schemas always omit sensitive fields (`passwordHash`, `apiKeyEncrypted`, `widgetToken`)". This was wrong: `widgetToken` is intentionally returned in `GET /client/me` because the dashboard needs to display it so clients can embed the widget on their website (`AccountSettingsTab`, `EmbedCodeCard`, widget-setup flow all read it).

The fix was applied but was reverted by a branch switch. Line 30 again reads the incorrect text.

**Fix:** Update `packages/db/CLAUDE.md` to remove `widgetToken` from the omit list and add a note explaining why it is intentionally included.

---

## 2. TOCTOU billing race — balance and monthly-spend checks

**File:** `apps/api/src/modules/widget/widget.service.ts:121`  
**Severity:** Correctness / Financial

Balance and monthly-spend are read with plain unlocked SELECTs before the LLM stream starts. Token cost is only deducted after the stream completes. Two concurrent requests both pass the pre-flight checks and both consume real LLM tokens. The DB-level balance guard prevents double-deduction (throws `BALANCE_INSUFFICIENT`) but not double LLM consumption. The monthly-spend path has no optimistic guard at deduction time at all.

**Fix:** Move the spend ceiling enforcement into the deduction transaction, or use `SELECT ... FOR UPDATE` on the balance row before starting the stream.

---

## 3. JWTs remain valid after password reset

**File:** `apps/api/src/modules/auth/auth.service.ts:203`  
**Severity:** Security

`resetPassword` updates the password hash but performs no JWT invalidation. `verifyToken` only validates the HMAC signature and expiry — it has no awareness that the password changed. No token-version column, no denylist.

**Fix:** Add a `tokenVersion` integer column to `clients`, increment it on password reset, embed it in the JWT payload, and verify it in `verifyToken` / `clientAuth` middleware.

---

## 4. Admin soft-delete has no write path

**File:** `apps/api/src/modules/admin/admin.repository.ts:16`  
**Severity:** Correctness

The `admin_users` table has `is_deleted boolean NOT NULL DEFAULT false` and `deleted_at timestamp`. All reads correctly filter `WHERE is_deleted = false`. However, no method anywhere in the codebase ever sets `is_deleted = true`. Admin accounts cannot be deactivated through the API — only via direct DB edit. The `activeAdminUsers` Postgres view defined in `packages/db/src/schema/admin.ts:23` is also never imported or queried.

**Fix:** Add a `softDeleteAdmin(id)` method to `AdminRepository` and wire a DELETE endpoint or admin management route to it. Switch the three callsites to query through `activeAdminUsers` view.

---

## 5. Audit log hard-filtered to 3 action types — most admin actions invisible

**File:** `apps/api/src/modules/admin/admin.repository.ts:168`  
**Severity:** Correctness / Compliance

`listActivityLogs` has a hard-coded `inArray(adminAccessLogs.actionType, ["impersonate", "suspend", "re-enable"])` filter. The audit middleware logs every successful mutating admin request — balance changes, config edits, etc. — with a URL-pattern string as the action type. Those rows are written to the DB but permanently invisible through `GET /admin/activity-logs`.

**Fix:** Either remove the IN filter (expose all action types) or add the additional action-type constants to the filter and ensure the middleware sets them explicitly.

---

## 6. Catch-all swallows `EmailDeliveryError` in anti-enumeration blocks

**File:** `apps/api/src/modules/auth/auth.routes.ts:204`  
**Severity:** Reliability

`/resend-verification` and `/forgot-password` both use bare `catch (err)` with no type guard or re-throw. The intent (prevent user enumeration by always returning 200) is correct for `NotFoundError`, but the same catch block silently discards `EmailDeliveryError`, DB exceptions, and all other errors — they never reach `errorHandler` and never reach Sentry. A full email-provider outage is invisible to monitoring.

**Fix:** Catch only `NotFoundError` / `AuthConflictError` for the enumeration-protection path; re-throw everything else.

---

## 7. Suspended accounts can complete a password reset

**File:** `apps/api/src/modules/auth/auth.service.ts:175`  
**Severity:** Security

Neither `requestPasswordReset` nor `resetPassword` checks `client.status`. The suspension check exists only in `login`. A suspended client can request a reset link and change their password while suspended, leaving a changed-password foothold ready for when the account is reinstated.

**Fix:** Add `if (client.status === "suspended") throw new UnauthorizedError(...)` in both `requestPasswordReset` and `resetPassword`.

---

## 8. `widgetConfigResponseSchema` is dead code with structural mismatch

**File:** `packages/db/src/dto/widget-config.dto.ts:5`  
**Severity:** Inconsistency / Maintenance

`widgetConfigResponseSchema` is derived from the raw DB table via `createSelectSchema` (`position: z.string()`, `lightColors: z.unknown()`). The actual widget-config routes use `widgetVisualConfigSchema` from `packages/shared` (`position: z.enum(["left","right"])`, strict typed color objects). The DTO export is imported by nothing in `apps/` and the two schemas are structurally incompatible.

**Fix:** Delete `widgetConfigResponseSchema` from `widget-config.dto.ts`. If a DTO is needed, derive it from `widgetVisualConfigSchema` via `z.infer`.

---

## 9. `widgetConfigClientRoutes` reverses the route export naming convention

**File:** `apps/api/src/modules/widget-config/index.ts:10`  
**Severity:** Naming / Consistency

Every other multi-audience route export follows `{audience}{Module}Routes`:
- `clientMcpRoutes`, `adminMcpRoutes`
- `clientAnalyticsRoutes`, `adminAnalyticsRoutes`

The widget-config module reverses this to `widgetConfigClientRoutes` (`{module}{audience}Routes`). A search for `^client.*Routes` in `app.ts` silently misses it.

**Fix:** Rename export to `clientWidgetConfigRoutes` (and update the import in `app.ts`).

---

## 10. `last30DaysSpendUsd` vs `totalCostUsd` — same concept, different names

**File:** `apps/api/src/modules/analytics/analytics.routes.ts:101`  
**Severity:** Naming / Consistency

Client analytics summary (`GET /client/me/analytics/summary`) uses `last30DaysSpendUsd`. Admin analytics (`GET /admin/analytics`) uses `totalCostUsd`. Both represent a USD-denominated cost amount in the same module with no documented distinction between "Spend" and "Cost".

**Fix:** Standardize on one name. `totalCostUsd` better reflects the semantics (it is the aggregated cost, not just 30-day spend). Update both response schemas and any frontend consumers.

---

## 11. SSRF via MCP server verification endpoints

**Files:** `apps/api/src/modules/agent/agent.mcp.ts`, `apps/api/src/modules/mcp/mcp.routes.ts:278,477`  
**Severity:** Security

Both `POST /v1/client/me/mcp/verify` and `POST /v1/admin/mcp/verify` accept a `mcpConfig` object from the request body and pass it directly to `verifyMcpServer()`, which opens a network connection to the caller-supplied URL with no validation. Any authenticated client (not just admins) can submit an arbitrary URL — including `http://localhost/...`, RFC-1918 addresses, or internal hostnames — and the server will attempt to connect and return whether it responded. This enables internal network scanning and potential access to services that trust the server's IP.

**Fix:** Validate the URL in `verifyMcpServer` before connecting: reject loopback addresses, RFC-1918 ranges (`10.x`, `172.16-31.x`, `192.168.x`), and `.internal` hostnames. Resolve the hostname and re-check the resulting IP.

---

## 12. Usage billing silently dropped on recording failure

**File:** `apps/api/src/modules/widget/widget.routes.ts:339`  
**Severity:** Correctness / Financial

`recordUsageAndAlert` is called fire-and-forget with only a `.catch()` that logs:

```ts
widgetService
  .recordUsageAndAlert(clientId, assistantMessage.id, tokensUsed)
  .catch((recordErr) => logger.error("Background usage recording failed", ...))
```

If the insert fails (DB unavailable, constraint violation, etc.) the client receives a successful response and sees the AI reply, but no tokens are deducted and no usage row is written. The failure is logged but never reaches Sentry's error handler and the conversation is not retried. Over time this silently under-bills clients.

**Fix:** Await `recordUsageAndAlert` before returning the SSE done event. If it throws, surface it through `errorHandler` so Sentry captures it. The client already has the full AI response by that point; a 500 on the billing step should still be observable.

---

## 13. TOCTOU race in MCP `enablePreMade`

**File:** `apps/api/src/modules/mcp/mcp.service.ts:54`  
**Severity:** Correctness

`enablePreMade` checks server existence with a plain `SELECT` then inserts the association in a separate statement with no transaction:

```ts
const server = await this.repo.getPreMadeServer(serverId)  // unlocked SELECT
if (!server) throw new NotFoundError(...)
await this.repo.enablePreMade(clientId, serverId)           // separate INSERT
```

If an admin deletes the server between the two statements the association row is inserted (silently via `onConflictDoNothing`) pointing to a now-deleted server. The client's enabled-server list will then include a ghost entry that fails at agent runtime.

**Fix:** Wrap both operations in a transaction with `SELECT ... FOR UPDATE` on the pre-made server row, or perform an atomic `INSERT INTO client_pre_made_mcp … WHERE EXISTS (SELECT 1 FROM pre_made_mcp_servers WHERE id = ?)` and check the affected row count.

---

## 14. Unbounded MCP list endpoints

**Files:** `apps/api/src/modules/mcp/mcp.repository.ts:15,63,97`, `apps/api/src/modules/mcp/mcp.routes.ts:28,52,164,337`  
**Severity:** Correctness / Reliability

Four list endpoints return every matching row with no `LIMIT`:

- `GET /v1/client/me/mcp/pre-made` — all pre-made servers
- `GET /v1/client/me/mcp/pre-made/enabled` — all enabled servers for the client
- `GET /v1/client/me/mcp/custom` — all custom servers for the client
- `GET /v1/admin/mcp/pre-made` — all pre-made servers (admin)

The shared `paginationQuerySchema` (max 100) exists in `packages/shared/src/validators/common.ts` but none of these routes apply it. An admin who creates many pre-made servers, or a client with many custom servers, can return arbitrarily large payloads on every request.

**Fix:** Add `paginationQuerySchema` to each route's `request.query` and pass `limit`/`offset` through to the repository queries.

---

## 15. `process.env` read directly in email template helper

**File:** `apps/api/src/common/email/templates.ts:27`  
**Severity:** Convention

`getAppUrl()` reads `process.env.APP_URL` directly instead of importing from `src/common/config.ts`:

```ts
const url = process.env.APP_URL
if (!url) throw new Error("APP_URL environment variable is not set")
```

`config.ts` validates all env vars at startup via Zod and provides typed, guaranteed values. Bypassing it means `APP_URL` is not validated at startup — a misconfigured deploy silently serves broken email links rather than failing fast.

**Fix:** Import `config` from `@/common/config` and use `config.APP_URL`. Add `APP_URL` to the config schema if it is not already there.

---

## 16. `providerConfigRepository` exported from module barrel and imported cross-module

**Files:** `apps/api/src/modules/provider-config/index.ts:11`, `apps/api/src/modules/rag/index.ts:3`  
**Severity:** Architecture

`provider-config/index.ts` exports the raw repository instance:

```ts
export { providerConfigRepository }
```

`rag/index.ts` then imports it directly:

```ts
import { providerConfigRepository } from "@/modules/provider-config/index"
```

This breaks the module boundary: `rag` now holds a direct reference to `provider-config`'s Drizzle repository, bypassing the service layer entirely. Changes to `ProviderConfigRepository`'s interface will silently affect RAG without going through any service contract.

**Fix:** Remove the repository export from `provider-config/index.ts`. Pass the dependency through `ProviderConfigService` (which already encapsulates the repository) or inject the repository into the RAG service via its constructor.

---

## 17. Dead DTO exports — `fileEmbeddingSchema` and `usageRecordResponseSchema`

**Files:** `packages/db/src/dto/rag.dto.ts:5`, `packages/db/src/dto/usage.dto.ts:5`  
**Severity:** Maintenance

`fileEmbeddingSchema` / `FileEmbedding` (rag.dto.ts) and `usageRecordResponseSchema` / `UsageRecordResponse` (usage.dto.ts) are exported but imported by nothing in `apps/` or `packages/shared/`. Both were likely intended for response schemas on analytics or RAG endpoints that were never wired up.

**Fix:** Delete the unused exports. If the corresponding endpoints are planned, track them in `docs/requirements.md` first.

---

## 18. Health check does not verify database connectivity

**File:** `apps/api/src/app.ts:91`  
**Severity:** Reliability

`GET /health` returns `{ message: "OK" }` unconditionally. Kubernetes liveness/readiness probes and load balancers use this endpoint to decide whether to route traffic. If the database connection pool is exhausted or Postgres is unreachable, the endpoint still returns 200 and the pod continues to receive requests that will all fail.

**Fix:** Run a lightweight DB probe (`SELECT 1`) inside the handler and return 503 if it throws. Guard with a short timeout (e.g. 2 s) to avoid blocking the probe indefinitely.

---

## 19. No explicit request body size limit

**File:** `apps/api/src/app.ts`, `apps/api/src/index.ts`  
**Severity:** Reliability

No body-size middleware is registered in `app.ts` or configured on the Bun server in `index.ts`. Bun's default limit is 128 MB. The file-upload endpoint (`POST /v1/client/me/files`) and the widget message endpoint both accept arbitrary request bodies up to that ceiling. A single crafted request can allocate 128 MB of heap in one shot; concurrent requests multiply the impact.

**Fix:** Register Hono's `bodyLimit` middleware globally or per-route with a sensible ceiling (e.g. 1 MB for JSON routes, a separate higher limit for the file upload route only).
