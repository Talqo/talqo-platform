# SCRUM-113 Integration Test Review Feedback Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align integration test configuration with `.env.example` as the canonical env source, fix CI credential drift, rename test files for Bun discovery, and remove redundant documentation.

**Architecture:** Environment-driven test setup using `.env.example` as the single source of truth; standard Bun test discovery via `*.test.ts` suffix; CI simplification by removing redundant env blocks.

**Tech Stack:** Bun, Hono, Drizzle, GitHub Actions, PostgreSQL, Biome

---

## File Inventory

- **Modify:** `apps/api/package.json` — `test:integration` and `db:migrate` scripts
- **Modify:** `.github/workflows/ci.yml` — service credentials and step env blocks
- **Modify:** `apps/api/src/common/test-utils.ts` — remove `setupTestEnv` helper
- **Modify:** `apps/api/src/modules/admin/admin.integration.ts` — rename to `.integration.test.ts`, remove `setupTestEnv` call
- **Modify:** `apps/api/src/modules/auth/auth.integration.ts` — rename to `.integration.test.ts`, remove `setupTestEnv` call
- **Modify:** `apps/api/src/modules/client-account/client-account.integration.ts` — rename to `.integration.test.ts`, remove `setupTestEnv` call
- **Modify:** `apps/api/src/modules/widget/widget.integration.ts` — rename to `.integration.test.ts`, inline widget env setup
- **Modify:** `CLAUDE.md` — delete Integration Tests section, add `bun run test:integration` to feedback loop

---

## Task 1: Rename Integration Test Files

**Files:**
- Rename: `apps/api/src/modules/admin/admin.integration.ts` → `apps/api/src/modules/admin/admin.integration.test.ts`
- Rename: `apps/api/src/modules/auth/auth.integration.ts` -> `apps/api/src/modules/auth/auth.integration.test.ts`
- Rename: `apps/api/src/modules/client-account/client-account.integration.ts` → `apps/api/src/modules/client-account/client-account.integration.test.ts`
- Rename: `apps/api/src/modules/widget/widget.integration.ts` → `apps/api/src/modules/widget/widget.integration.test.ts`

- [ ] **Step 1: Rename files**

Run:
```bash
cd apps/api/src/modules/admin && mv admin.integration.ts admin.integration.test.ts
cd ../auth && mv auth.integration.ts auth.integration.test.ts
cd ../client-account && mv client-account.integration.ts client-account.integration.test.ts
cd ../widget && mv widget.integration.ts widget.integration.test.ts
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/admin/admin.integration.test.ts apps/api/src/modules/auth/auth.integration.test.ts apps/api/src/modules/client-account/client-account.integration.test.ts apps/api/src/modules/widget/widget.integration.test.ts
git rm apps/api/src/modules/admin/admin.integration.ts apps/api/src/modules/auth/auth.integration.ts apps/api/src/modules/client-account/client-account.integration.ts apps/api/src/modules/widget/widget.integration.ts
git commit -m "test(api): rename integration test files to *.integration.test.ts for Bun discovery"
```

---

## Task 2: Update API Package Scripts

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 1: Update `test:integration` to use `--env-file` and auto-discovery**

Change the script from a hardcoded list to Bun's auto-discovery:

```json
"test:integration": "bun --env-file=../../.env.example test --timeout 30000 ./src/modules/**/*.integration.ts",
```

**Why single-quoted glob:** the shell must prevent expansion so Bun receives the pattern.

- [ ] **Step 2: Update `db:migrate` to use `.env.example`**

Change:
```json
"db:migrate": "cd ../../packages/db && bun --env-file=../../.env.example run drizzle-kit migrate",
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/package.json
git commit -m "ci(api): use .env.example for integration tests and db:migrate"
```

---

## Task 3: Update CI Workflow

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Update postgres service credentials to match `.env.example`**

Change the `postgres` service env from:
```yaml
env:
  POSTGRES_USER: test
  POSTGRES_PASSWORD: test
  POSTGRES_DB: test
```
to:
```yaml
env:
  POSTGRES_USER: pagepal
  POSTGRES_PASSWORD: password
  POSTGRES_DB: pagepal
```

- [ ] **Step 2: Remove redundant env block from DB migrations step**

Change:
```yaml
      - name: Run DB migrations
        run: cd packages/db && bun run drizzle-kit migrate
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_HOST: localhost
          POSTGRES_PORT: 5432
          POSTGRES_DB: test
```
to:
```yaml
      - name: Run DB migrations
        run: cd packages/db && bun --env-file=../../.env.example run drizzle-kit migrate
```

- [ ] **Step 3: Remove redundant env block from integration tests step**

Change:
```yaml
      - name: Run integration tests
        run: cd apps/api && bun run test:integration
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_HOST: localhost
          POSTGRES_PORT: 5432
          POSTGRES_DB: test
```
to:
```yaml
      - name: Run integration tests
        run: cd apps/api && bun run test:integration
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: align CI postgres credentials with .env.example and remove redundant env blocks"
```

---

## Task 4: Remove `setupTestEnv` and Update Test Files

**Files:**
- Modify: `apps/api/src/common/test-utils.ts`
- Modify: `apps/api/src/modules/admin/admin.integration.test.ts`
- Modify: `apps/api/src/modules/auth/auth.integration.test.ts`
- Modify: `apps/api/src/modules/client-account/client-account.integration.test.ts`
- Modify: `apps/api/src/modules/widget/widget.integration.test.ts`

- [ ] **Step 1: Remove `setupTestEnv` from `test-utils.ts`**

Delete the `setupTestEnv` function and its JSDoc. Keep `setupWidgetTestEnv` but remove its call to `setupTestEnv()`.

- [ ] **Step 2: Update `setupWidgetTestEnv` to set `APP_URL` and `RESEND_API_KEY` directly**

Since `setupTestEnv` is gone, `setupWidgetTestEnv` must set its own base vars (or rely on `.env.example`). Add the two base assignments:

```typescript
export function setupWidgetTestEnv(): void {
	process.env.APP_URL ??= "http://localhost:5173"
	process.env.RESEND_API_KEY ??= "test-api-key"
	process.env.DEFAULT_LLM_PROVIDER_TYPE ??= "openai_compatible"
	process.env.DEFAULT_LLM_API_KEY ??= "test-key"
	process.env.DEFAULT_LLM_MODEL ??= "test-model"
	process.env.DEFAULT_LLM_BASE_URL ??= "http://localhost:1234"
}
```

- [ ] **Step 3: Remove `setupTestEnv` import and call from admin, auth, and client-account test files**

In each file, delete the `setupTestEnv` import and the `setupTestEnv()` call inside `beforeAll`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/common/test-utils.ts apps/api/src/modules/admin/admin.integration.test.ts apps/api/src/modules/auth/auth.integration.test.ts apps/api/src/modules/client-account/client-account.integration.test.ts
git commit -m "refactor(api): remove setupTestEnv helper, rely on .env.example for integration test env"
```

---

## Task 5: Update Root `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add `bun run test:integration` to the feedback loop code block**

Change:
```bash
bun run fix
bun run type-check
bun run test
make e2e
```
to:
```bash
bun run fix
bun run type-check
bun run test
bun run test:integration
make e2e
```

- [ ] **Step 2: Delete the entire `## Integration Tests` section**

Remove lines 56–82 (the section starting with `## Integration Tests` through the end of the conventions list).

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add test:integration to feedback loop and remove redundant Integration Tests section"
```

---

## Task 6: Verification

- [ ] **Step 1: Run format and type-check**

```bash
bun run fix
bun run type-check
```

Fix any Biome or TypeScript errors.

- [ ] **Step 2: Run integration tests**

```bash
cd apps/api && bun run test:integration
```

Confirm tests discover all four integration files automatically and pass.

- [ ] **Step 3: Stage any fixes and commit**

```bash
git add -A
git commit -m "style: apply biome fixes after test rename"
```

---

## Spec Coverage Checklist

| Review Comment | Task | Status |
|---|---|---|
| Use `.env.example` as canonical env source | Task 2, Task 3 | Covers `test:integration` script and CI |
| CI credentials match `.env.example` | Task 3 | Postgres service updated |
| Remove redundant CI `env:` blocks | Task 3 | Both migration and test steps |
| Rename `*.integration.ts` → `*.integration.test.ts` | Task 1 | All 4 files |
| Remove hardcoded test file list | Task 2 | Auto-discovery via glob |
| Remove `setupTestEnv` | Task 4 | Function removed, test files updated |
| Update feedback loop | Task 5 | `bun run test:integration` added |
| Delete Integration Tests section | Task 5 | Removed from `CLAUDE.md` |

