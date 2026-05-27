# PR Review Fixes Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** Address all PR review comments and fix CI migration failure.

---

## Task 1: Fix CI migration failure

**Files:**
- Modify: `.github/workflows/ci.yml`

### Problem
1. CI uses plain `postgres:16-alpine` but migrations require `pgvector` extension
2. `drizzle.config.ts` reads `POSTGRES_*` vars, not `DATABASE_URL`; CI step sets only `DATABASE_URL`
3. `--env-file=../../.env` loads dev credentials, overriding CI env for missing vars

### Fix
- Change postgres image to `pgvector/pgvector:pg17`
- Remove `--env-file=../../.env` from migrate step
- Set `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`

---

## Task 2: Fix SKILL.md template references

**Files:**
- Modify: `.claude/skills/subagent-driven-development/SKILL.md`

### Problem
Lines 124-127 reference `./implementer-prompt.md`, `./spec-reviewer-prompt.md`, `./code-quality-reviewer-prompt.md` but actual files use `./implementer-promt.md`, etc.

### Fix
Update template references in SKILL.md to match actual filenames, OR rename files to correct spelling.

---

## Task 3: Add verify-email response assertions in admin tests

**Files:**
- Modify: `apps/api/src/modules/admin/admin.integration.ts`

### Problem
Line ~67: verify-email request result isn't checked.

### Fix
Capture response and assert status 200 before querying `clients`.

---

## Task 4: Fix auth integration tests

**Files:**
- Modify: `apps/api/src/modules/auth/auth.integration.ts`

### Problems
1. `getVerificationToken` returns undefined → generates `token=undefined` URLs
2. Test description says "POST" but `realApp.request` uses GET

### Fixes
1. Throw descriptive error in `getVerificationToken` when token missing
2. Change test title from "POST" to "GET"

---

## Task 5: Add token guard in client-account tests

**Files:**
- Modify: `apps/api/src/modules/client-account/client-account.integration.ts`

### Problem
`getVerificationToken` may return undefined but test proceeds without checking.

### Fix
Throw error in `getVerificationToken` when token is undefined (same pattern as auth).

---

## Task 6: Fix widget integration tests

**Files:**
- Modify: `apps/api/src/modules/widget/widget.integration.ts`

### Problems
1. Verify-email response not checked
2. `widget-rate-limit` middleware is mocked (was needed before middleware fix)

### Fixes
1. Assert verify-email response status before querying clients
2. Remove `mock.module("@/common/middleware/widget-rate-limit", ...)` — real middleware now handles test env since `widget-rate-limit.ts` is fixed
3. Re-run widget tests to confirm they pass with real middleware

---

## Task 7: Fix integration tests plan doc

**Files:**
- Modify: `docs/superpowers/plans/2026-05-22-integration-tests.md`

### Problems
1. Mentions `app.fetch()` instead of `app.request()`
2. Hardcoded `/workspaces/pb138` path

### Fixes
1. Replace all `app.fetch()` with `app.request()`
2. Replace hardcoded path with `cd "$(git rev-parse --show-toplevel)"`

---

## Task 8: Fix widget rate-limit IP resolution

**Files:**
- Modify: `apps/api/src/common/middleware/widget-rate-limit.ts`

### Problem
When `directIp` is missing, `validForwarded` is used even if `isTrustedProxy` is false.

### Fix
Change:
```typescript
const ip = isTrustedProxy && validForwarded ? validForwarded : directIp || validForwarded
```
to:
```typescript
const ip = isTrustedProxy && validForwarded ? validForwarded : directIp
```

---

## Verification

After all fixes:
```bash
cd "$(git rev-parse --show-toplevel)"
bun run check --write --unsafe
bun run type-check
bun run test
bun run test:integration
```

Expected: 301 unit pass, 22 integration pass.
