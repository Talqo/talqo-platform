# Codebase Audit Findings

19 confirmed issues ranked by severity. Found via multi-angle static analysis (June 2026). All items fixed except #16 (false positive, no fix needed) and #7 (fix scoped down — see note).

---

## 1. SSRF via IPv6-literal bypass in MCP URL validation — ✅ Fixed

**File:** `packages/shared/src/validators/mcp.ts`  
**Severity:** Security

**Correction:** This finding originally claimed MCP config URLs had *no* validation at all. That was wrong — `isPublicHttpsUrl` (present since the initial commit, predating this audit) already enforces HTTPS and blocks `localhost` plus IPv4 loopback/RFC-1918/link-local literals, and is wired into every schema that accepts a client- or admin-supplied URL (`mcpConfigBodySchema`, `adminMcpConfigBodySchema`, `adminMcpVerifyBodySchema`). The client `/verify`-by-ID route never accepted a raw URL to begin with.

The real, narrower gap: IPv6 literals were only checked against the exact string `::1`. An authenticated client could bypass every check with an IPv6-literal address — `https://[fc00::1]` (unique-local), `https://[fe80::1]` (link-local), or `https://[::ffff:127.0.0.1]` (IPv4-mapped loopback, normalized by the URL parser to `[::ffff:7f00:1]`) all passed validation and would let the server connect internally when the config is used to verify or run an MCP connection.

**Fix applied:** Added `expandIpv6Groups` / `isPrivateIpv6Literal` to `packages/shared/src/validators/mcp.ts` to properly parse IPv6 literals (handling `::` compression and embedded IPv4 tails) and reject loopback, `fc00::/7`, `fe80::/10`, and IPv4-mapped private addresses. Covered by 5 new regression cases in `mcp.test.ts` (36/36 passing).

DNS rebinding (a hostname that resolves to a private IP at connection time) remains an accepted, documented residual risk — the existing code comment already calls this out as requiring network-level egress filtering rather than app-level validation.

---

## 2. JWTs remain valid after password reset — ✅ Fixed

**File:** `apps/api/src/modules/auth/auth.service.ts:203`  
**Severity:** Security

`resetPassword` updates the password hash but performs no JWT invalidation. `verifyToken` only validates the HMAC signature and expiry — it has no awareness that the password changed. No token-version column, no denylist.

**Fix applied:** Added a `tokenVersion` integer column to `clients` (migration `0019_naive_toad_men.sql`), incremented on every password change, embedded in the JWT payload at sign time, and checked against the DB value in `clientAuth` middleware — a mismatch throws `UnauthorizedError`.

---

## 3. Suspended accounts can complete a password reset — ✅ Fixed

**File:** `apps/api/src/modules/auth/auth.service.ts:175`  
**Severity:** Security

Neither `requestPasswordReset` nor `resetPassword` checks `client.status`. The suspension check exists only in `login`. A suspended client can request a reset link and change their password while suspended, leaving a changed-password foothold ready for when the account is reinstated.

**Fix applied:** Added a suspended-status check to both `requestPasswordReset` (silent early-return, preserving anti-enumeration behavior) and `resetPassword` (throws `UnauthorizedError` before hashing the new password). Covered by new regression tests in `auth.test.ts`.

---

## 4. TOCTOU billing race — balance and monthly-spend checks — ✅ Fixed

**File:** `apps/api/src/modules/widget/widget.service.ts:121`  
**Severity:** Correctness / Financial

Balance and monthly-spend are read with plain unlocked SELECTs before the LLM stream starts. Token cost is only deducted after the stream completes. Two concurrent requests both pass the pre-flight checks and both consume real LLM tokens. The DB-level balance guard prevents double-deduction (throws `BALANCE_INSUFFICIENT`) but not double LLM consumption. The monthly-spend path has no optimistic guard at deduction time at all.

**Fix applied:** `recordUsage`'s transaction now takes `SELECT ... FOR UPDATE` on the client's balance row and enforces the monthly-spend ceiling inside the same transaction, before the deduction commits. Covered by new regression tests in `widget.service.test.ts`.

---

## 5. Usage billing silently dropped on recording failure — ✅ Fixed

**File:** `apps/api/src/modules/widget/widget.routes.ts:339`  
**Severity:** Correctness / Financial

`recordUsageAndAlert` is called fire-and-forget with only a `.catch()` that logs:

```ts
widgetService
  .recordUsageAndAlert(clientId, assistantMessage.id, tokensUsed)
  .catch((recordErr) => logger.error("Background usage recording failed", ...))
```

If the insert fails (DB unavailable, constraint violation, etc.) the client receives a successful response and sees the AI reply, but no tokens are deducted and no usage row is written. The failure is logged but never reaches Sentry's error handler and the conversation is not retried. Over time this silently under-bills clients.

**Fix applied:** `recordUsageAndAlert` stays fire-and-forget (it does 3+ DB round trips and awaiting it would add latency to every chat turn for no behavioral gain — the "done" event ships regardless of recording outcome either way), but its `.catch()` now reports failures to Sentry via `Sentry.captureException` in addition to logging. Confirmed via a new integration test simulating insufficient-balance-at-recording-time.

---

## 6. Audit log hard-filtered to 3 action types — most admin actions invisible — ✅ Fixed

**File:** `apps/api/src/modules/admin/admin.repository.ts:168`  
**Severity:** Correctness / Compliance

`listActivityLogs` has a hard-coded `inArray(adminAccessLogs.actionType, ["impersonate", "suspend", "re-enable"])` filter. The audit middleware logs every successful mutating admin request — balance changes, config edits, etc. — with a URL-pattern string as the action type. Those rows are written to the DB but permanently invisible through `GET /admin/activity-logs`.

**Fix applied:** Removed the `inArray` filter (and the now-unused `inArray` import) from `listActivityLogs` — all logged admin actions are now returned. Covered by a new integration test asserting a previously-unlabeled action type surfaces in the response.

---

## 7. Admin soft-delete has no write path — ⚠️ Partially fixed

**File:** `apps/api/src/modules/admin/admin.repository.ts:16`  
**Severity:** Correctness

The `admin_users` table has `is_deleted boolean NOT NULL DEFAULT false` and `deleted_at timestamp`. All reads correctly filter `WHERE is_deleted = false`. However, no method anywhere in the codebase ever sets `is_deleted = true`. Admin accounts cannot be deactivated through the API — only via direct DB edit. The `activeAdminUsers` Postgres view defined in `packages/db/src/schema/admin.ts:23` is also never imported or queried.

**Fix applied (partial):** Added `softDeleteAdmin(id): Promise<boolean>` to `AdminRepository`, and switched `findAdminByEmail` / `findAdminById` / `admin-auth` middleware to query the `activeAdminUsers` view instead of manually filtering `is_deleted`. Covered by a new integration test exercising `softDeleteAdmin` end-to-end.

**Not done:** No DELETE endpoint or admin-management route was wired up to call `softDeleteAdmin` — exposing admin deactivation through the API is a product decision (who can deactivate whom, self-deactivation guard, audit-log entry, etc.) and an untracked feature per `docs/requirements.md`. Flagged to the dev; not implemented pending a decision.

---

## 8. Raw FK-violation error leaks past MCP `enablePreMade`'s race window — ✅ Fixed

**File:** `apps/api/src/modules/mcp/mcp.repository.ts`  
**Severity:** Correctness

**Correction:** This finding originally claimed the race between `getPreMadeServer`'s existence check and `enablePreMade`'s insert could create a "ghost" `client_pre_made_mcp` row pointing at a deleted server. That's not possible: `client_pre_made_mcp.pre_made_mcp_id` has a `REFERENCES pre_made_mcp_servers.id ON DELETE CASCADE` foreign key (`packages/db/src/schema/mcp.ts:26-28`). Verified directly against Postgres — inserting a row with a deleted server's id fails with a `23503` foreign_key_violation; it does not silently succeed via `onConflictDoNothing` (that clause only suppresses primary-key conflicts, not FK violations). Deleting a server that's already enabled for clients also cascades and removes those join rows automatically, so no ghost entries can persist either way.

The real (much narrower) gap: if an admin deletes the server in the few milliseconds between the check and the insert, the insert throws a raw, unhandled Postgres FK-violation error instead of the clean `NotFoundError` the endpoint is supposed to return — a confusing 500 instead of a 404 in an already-rare race window.

**Fix applied:** `enablePreMade` in `mcp.repository.ts` now catches Postgres error code `23503` and rethrows it as `NotFoundError("Pre-made MCP server not found")`, matching the `isUniqueViolation` pattern already used in `auth.repository.ts`.

---

## 9. Unbounded MCP list endpoints — ✅ Fixed

**Files:** `apps/api/src/modules/mcp/mcp.repository.ts:15,63,97`, `apps/api/src/modules/mcp/mcp.routes.ts:28,52,164,337`  
**Severity:** Correctness / Reliability

Four list endpoints return every matching row with no `LIMIT`:

- `GET /v1/client/me/mcp/pre-made` — all pre-made servers
- `GET /v1/client/me/mcp/pre-made/enabled` — all enabled servers for the client
- `GET /v1/client/me/mcp/custom` — all custom servers for the client
- `GET /v1/admin/mcp/pre-made` — all pre-made servers (admin)

The shared `paginationQuerySchema` (max 100) exists in `packages/shared/src/validators/common.ts` but none of these routes apply it. An admin who creates many pre-made servers, or a client with many custom servers, can return arbitrarily large payloads on every request.

**Fix applied:** Added `paginationQuerySchema` to all four routes' `request.query`, threaded `limit`/`offset` through the service layer into the repository queries. Covered by a new integration test asserting `limit=1` returns exactly one of three seeded servers.

---

## 10. Health check does not verify database connectivity — ✅ Fixed

**File:** `apps/api/src/app.ts:91`  
**Severity:** Reliability

`GET /health` returns `{ message: "OK" }` unconditionally. Kubernetes liveness/readiness probes and load balancers use this endpoint to decide whether to route traffic. If the database connection pool is exhausted or Postgres is unreachable, the endpoint still returns 200 and the pod continues to receive requests that will all fail.

**Fix applied:** `/health` now runs `db.execute(sql\`SELECT 1\`)` with a 2 s timeout and returns 503 if it throws or times out. Discovered as a side effect: this real DB call broke existing unit-test isolation in `app.test.ts` / `index.test.ts` (test creds don't match the running container), fixed by mocking `@/db` in both.

---

## 11. No explicit request body size limit — ✅ Fixed

**File:** `apps/api/src/app.ts`, `apps/api/src/index.ts`  
**Severity:** Reliability

No body-size middleware is registered in `app.ts` or configured on the Bun server in `index.ts`. Bun's default limit is 128 MB. The file-upload endpoint (`POST /v1/client/me/files`) and the widget message endpoint both accept arbitrary request bodies up to that ceiling. A single crafted request can allocate 128 MB of heap in one shot; concurrent requests multiply the impact.

**Fix applied:** Registered Hono's `bodyLimit` middleware in `app.ts` — 1 MB default for JSON routes, 20 MB carve-out for the file-upload route (`/v1/client/me/files/*`). Covered by new tests asserting 413 on oversized JSON and correct pass-through/413 behavior on the file route.

---

## 12. Catch-all swallows `EmailDeliveryError` in anti-enumeration blocks — ✅ Fixed

**File:** `apps/api/src/modules/auth/auth.routes.ts:204`  
**Severity:** Reliability

`/resend-verification` and `/forgot-password` both use bare `catch (err)` with no type guard or re-throw. The intent (prevent user enumeration by always returning 200) is correct for `NotFoundError`, but the same catch block silently discards `EmailDeliveryError`, DB exceptions, and all other errors — they never reach `errorHandler` and never reach Sentry. A full email-provider outage is invisible to monitoring.

**Fix applied:** Removed the swallow-all try/catch from both handlers entirely — `requestPasswordReset`'s suspended/not-found anti-enumeration behavior already returns silently at the service layer, so no route-level catch was needed. Genuine errors (e.g. `EmailDeliveryError`) now propagate to `errorHandler`/Sentry. Covered by new tests asserting a 500 surfaces on email-delivery failure for both routes.

---

## 13. `providerConfigRepository` exported from module barrel and imported cross-module — ✅ Fixed

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

**Fix applied:** Removed the repository export from `provider-config/index.ts`. `rag/index.ts` now imports the `ProviderConfigRepository` class directly and constructs its own instance, rather than reaching into `provider-config`'s live repository instance.

---

## 14. `process.env` read directly in email template helper — ✅ Fixed

**File:** `apps/api/src/common/email/templates.ts:27`  
**Severity:** Convention

`getAppUrl()` reads `process.env.APP_URL` directly instead of importing from `src/common/config.ts`:

```ts
const url = process.env.APP_URL
if (!url) throw new Error("APP_URL environment variable is not set")
```

`config.ts` validates all env vars at startup via Zod and provides typed, guaranteed values. Bypassing it means `APP_URL` is not validated at startup — a misconfigured deploy silently serves broken email links rather than failing fast.

**Fix applied:** `getAppUrl()` now imports `config` from `@/common/config` and reads `config.APP_URL` (already present in the validated config schema). Removed the now-dead `process.env.APP_URL` assignment from `email.service.test.ts`.

---

## 15. `widgetConfigClientRoutes` reverses the route export naming convention — ✅ Fixed

**File:** `apps/api/src/modules/widget-config/index.ts:10`  
**Severity:** Naming / Consistency

Every other multi-audience route export follows `{audience}{Module}Routes`:
- `clientMcpRoutes`, `adminMcpRoutes`
- `clientAnalyticsRoutes`, `adminAnalyticsRoutes`

The widget-config module reverses this to `widgetConfigClientRoutes` (`{module}{audience}Routes`). A search for `^client.*Routes` in `app.ts` silently misses it.

**Fix applied:** Renamed export to `clientWidgetConfigRoutes` and updated the import in `app.ts` and all other callsites.

---

## 16. `last30DaysSpendUsd` vs `totalCostUsd` — false positive, not a naming bug

**File:** `apps/api/src/modules/analytics/analytics.repository.ts:186-206` (client), `:210-217` (admin)  
**Severity:** N/A — no fix applied

**Correction:** This finding claimed the two fields were the same concept with inconsistent names. They are not. `last30DaysSpendUsd` (client summary) is computed with an explicit rolling-window filter — `gte(usageRecords.recordedAt, thirtyDaysAgo)` and `lte(usageRecords.recordedAt, now)` — a genuine last-30-days sum. `totalCostUsd` (`getPlatformStats`, admin) sums `usageRecords.costUsd` with **no date filter at all** — a genuine all-time total across all clients. Renaming one to match the other, as originally suggested, would have made the field name lie about what it actually represents. No code change made.

---

## 17. `widgetConfigResponseSchema` is dead code with structural mismatch — ✅ Fixed

**File:** `packages/db/src/dto/widget-config.dto.ts:5`  
**Severity:** Inconsistency / Maintenance

`widgetConfigResponseSchema` is derived from the raw DB table via `createSelectSchema` (`position: z.string()`, `lightColors: z.unknown()`). The actual widget-config routes use `widgetVisualConfigSchema` from `packages/shared` (`position: z.enum(["left","right"])`, strict typed color objects). The DTO export is imported by nothing in `apps/` and the two schemas are structurally incompatible.

**Fix applied:** Deleted `packages/db/src/dto/widget-config.dto.ts` entirely (zero usages) and its barrel export from `dto/index.ts`. The widget-config routes already correctly use `widgetVisualConfigSchema` from `packages/shared`; no replacement DTO was needed.

---

## 18. Dead DTO exports — `fileEmbeddingSchema` and `usageRecordResponseSchema` — ✅ Fixed

**Files:** `packages/db/src/dto/rag.dto.ts:5`, `packages/db/src/dto/usage.dto.ts:5`  
**Severity:** Maintenance

`fileEmbeddingSchema` / `FileEmbedding` (rag.dto.ts) and `usageRecordResponseSchema` / `UsageRecordResponse` (usage.dto.ts) are exported but imported by nothing in `apps/` or `packages/shared/`. Both were likely intended for response schemas on analytics or RAG endpoints that were never wired up.

**Fix applied:** Deleted both files (`rag.dto.ts`, `usage.dto.ts`) and their barrel exports from `dto/index.ts`. No corresponding endpoints are currently planned in `docs/requirements.md`, so no replacement was added.

---

## 19. `packages/db/CLAUDE.md` incorrectly listed `widgetToken` as a field to omit — ✅ Fixed

**File:** `packages/db/CLAUDE.md`  
**Severity:** Documentation

`CLAUDE.md` stated "Response schemas always omit sensitive fields (`passwordHash`, `apiKeyEncrypted`, `widgetToken`)". This was wrong: `widgetToken` is intentionally returned in `GET /client/me` because the dashboard needs to display it so clients can embed the widget on their website (`AccountSettingsTab`, `EmbedCodeCard`, widget-setup flow all read it).

An earlier fix attempt was reverted by a branch switch during this audit; it has since been reapplied and verified in place.

**Fix applied:** Updated the omit list to `passwordHash`, `apiKeyEncrypted`, `tokenVersion` (dropping `widgetToken`), and added a line explaining `widgetToken` is intentionally included in `clientResponseSchema` for the dashboard's embed-code flow.

---
