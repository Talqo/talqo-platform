# CodeRabbit Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all 14 CodeRabbit review comments to improve security, reliability, and correctness of the auth flow and related components.

**Architecture:** This is a set of independent fixes across multiple files. Each task is self-contained and can be executed independently. Tasks are grouped by priority: HIGH (security/reliability bugs), MEDIUM (API docs, UX improvements).

**Tech Stack:** Hono (API), React + TanStack Router (Web), Drizzle ORM, Zod, TypeScript

---

## Priority: HIGH (Security/Correctness)

### Task 1: Make RESEND_API_KEY and APP_URL Required

**Files:**
- Modify: `apps/api/src/common/config.ts:16-17`

**Problem:** These env vars are marked optional but required for email flow. Making them optional moves failures from startup to runtime.

- [ ] **Step 1: Remove .optional() from RESEND_API_KEY and APP_URL**

```typescript
// Change from:
RESEND_API_KEY: z.string().min(1).optional(),
APP_URL: z.string().url().optional(),

// To:
RESEND_API_KEY: z.string().min(1),
APP_URL: z.string().url(),
```

- [ ] **Step 2: Verify by checking file syntax**

Run: `cd apps/api && bun check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/common/config.ts
git commit -m "fix(config): make email env vars required for early validation"
```

---

### Task 2: Remove PII Logging from Email Service

**Files:**
- Modify: `apps/api/src/common/email/email.service.ts:35,39-46`

**Problem:** Logs recipient email addresses (PII) and subjects in multiple places.

- [ ] **Step 1: Update send() function to remove PII from logs**

```typescript
// Line 35: Remove to and subject from info log
// Change from:
logger.info("Sending email", { to, subject })
// To:
logger.info("Sending email", { subject })

// Lines 39-46: Update error and success logs
// Change from:
logger.error("Failed to send email", {
    to,
    subject,
    error: result.error.message,
})
throw new Error(`Failed to send email to ${to}: ${result.error.message}`)
}
logger.info("Email sent successfully", { to, subject, id: result.data?.id })

// To:
logger.error("Failed to send email", {
    subject,
    error: result.error.message,
})
throw new Error("Failed to send email")
}
logger.info("Email sent successfully", { subject, id: result.data?.id })
```

- [ ] **Step 2: Run tests to verify email service still works**

Run: `cd apps/api && bun test src/common/email/email.service.test.ts`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/common/email/email.service.ts
git commit -m "fix(email): remove PII from service logs"
```

---

### Task 3: Fix Case-Insensitive Email Lookup in InMemoryAuthRepository

**Files:**
- Modify: `apps/api/src/modules/auth/auth.repository.ts:90-96`

**Problem:** `findPendingByEmail()` lowercases the input but compares against raw `pending.email` - won't match if stored email had different casing.

- [ ] **Step 1: Fix the comparison to also lowercase stored email**

```typescript
// Lines 90-96: Change from:
async findPendingByEmail(email: string): Promise<PendingRegistration | null> {
    const canonical = email.toLowerCase()
    for (const pending of this.pendingRegistrations.values()) {
        if (pending.email === canonical) return pending
    }
    return null
}

// To:
async findPendingByEmail(email: string): Promise<PendingRegistration | null> {
    const canonical = email.toLowerCase()
    for (const pending of this.pendingRegistrations.values()) {
        if (pending.email.toLowerCase() === canonical) return pending
    }
    return null
}
```

- [ ] **Step 2: Run auth tests to verify**

Run: `cd apps/api && bun test src/modules/auth/auth.test.ts`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/auth/auth.repository.ts
git commit -m "fix(auth): normalize email in findPendingByEmail for case-insensitive lookup"
```

---

### Task 4: Don't Echo Email-Send Failures to Client

**Files:**
- Modify: `apps/api/src/modules/auth/auth.routes.ts:82-98`

**Problem:** Returns `err.message` in API response, exposing internal details.

- [ ] **Step 1: Update error handler to log internally but return generic message**

```typescript
// Lines 82-98: Change the error handler from:
if (err instanceof Error) {
    c.get("logger").error("Registration error", {
        error: err.message,
        email,
    })
    return c.json(
        {
            success: false as const,
            error: {
                code: "EMAIL_FAILED",
                message: `Failed to send verification email: ${err.message}`,
            },
        },
        500,
    )
}

// To:
if (err instanceof Error) {
    c.get("logger").error("Registration error", {
        error: err.message,
        email,
    })
    return c.json(
        {
            success: false as const,
            error: {
                code: "EMAIL_FAILED",
                message: "Failed to send verification email",
            },
        },
        500,
    )
}
```

- [ ] **Step 2: Run auth tests**

Run: `cd apps/api && bun test src/modules/auth/auth.test.ts`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/auth/auth.routes.ts
git commit -m "fix(auth): don't echo email errors to client for security"
```

---

### Task 5: Remove Verification Token Logging from Auth Service

**Files:**
- Modify: `apps/api/src/modules/auth/auth.service.ts:36,134-137`

**Problem:** Logs verification tokens which are effectively secrets.

- [ ] **Step 1: Remove token from register() log**

```typescript
// Line 36: Change from:
logger.info("Sending verification email", { email: canonical, token })
// To:
logger.info("Sending verification email", { email: canonical })
```

- [ ] **Step 2: Remove token from resendVerificationEmail() log**

```typescript
// Lines 134-137: Change from:
logger.info("Resending verification email", {
    email: canonical,
    token: pending.token,
})

// To:
logger.info("Resending verification email", { email: canonical })
```

- [ ] **Step 3: Run tests**

Run: `cd apps/api && bun test src/modules/auth/auth.test.ts`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/auth/auth.service.ts
git commit -m "fix(auth): remove verification tokens from logs"
```

---

### Task 6: Split current-admin Endpoint from adminClientRoutes

**Files:**
- Modify: `apps/api/src/app.ts:72-74`
- Modify: `apps/api/src/modules/admin/admin.routes.ts`
- Modify: `apps/api/src/modules/admin/index.ts`

**Problem:** adminClientRoutes mounted at both /admin/me and /admin/clients causes /admin/me/me path.

- [ ] **Step 1: Check current admin routes exports and structure**

Read: `apps/api/src/modules/admin/index.ts`
Read: `apps/api/src/modules/admin/admin.routes.ts:91-147`

- [ ] **Step 2: Create separate current admin router or fix mounting**

Option 1: In admin.routes.ts, change the path from "/me" to "/" on line 98

```typescript
// Line 98: Change from:
path: "/me",
// To:
path: "/",
```

Option 2: Create separate router function for current admin endpoint

For now, use Option 1 (simpler fix):

```typescript
// In admin.routes.ts line 98:
path: "/", // Mounted at /admin/me, so this creates /admin/me
```

- [ ] **Step 3: Update tests and verify**

Run: `cd apps/api && bun test src/modules/admin/admin.test.ts`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/admin/admin.routes.ts
git commit -m "fix(admin): correct current-admin endpoint path from /me to /"
```

---

### Task 7: Fix BackOfficeStatCard Prop Mismatch

**Files:**
- Modify: `apps/web/src/routes/backoffice.index.tsx:65`

**Problem:** Component expects `subtitle` prop but `description` is passed.

- [ ] **Step 1: Change description to subtitle**

```typescript
// Line 65: Change from:
description="Active tenants"
// To:
subtitle="Active tenants"
```

- [ ] **Step 2: Type check**

Run: `cd apps/web && bun check`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/backoffice.index.tsx
git commit -m "fix(backoffice): correct BackOfficeStatCard prop from description to subtitle"
```

---

## Priority: MEDIUM (Improvements)

### Task 8: Document 400 Response for Resend-Verification Route

**Files:**
- Modify: `apps/api/src/modules/auth/auth.routes.ts:264-274`

**Problem:** OpenAPI spec only advertises 200 but handler can return 400 on invalid email.

- [ ] **Step 1: Add 400 response to OpenAPI route definition**

```typescript
// After line 274 (the 200 response block), add:
400: {
    description: "Invalid email format",
    content: { "application/json": { schema: errorResponseSchema } },
},
```

The responses object should look like:
```typescript
responses: {
    200: {
        description:
            "If a pending registration exists, verification email sent",
        content: {
            "application/json": {
                schema: successResponseSchema(z.object({ message: z.string() })),
            },
        },
    },
    400: {
        description: "Invalid email format",
        content: { "application/json": { schema: errorResponseSchema } },
    },
},
```

- [ ] **Step 2: Type check**

Run: `cd apps/api && bun check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/auth/auth.routes.ts
git commit -m "docs(api): document 400 response for resend-verification endpoint"
```

---

### Task 9: Remove Debug Logs with Tokens from Verify-Email Page

**Files:**
- Modify: `apps/web/src/routes/verify-email.tsx:95,99,110`

**Problem:** Console logs expose tokens and auth data in browser.

- [ ] **Step 1: Remove all debug console.log statements from useEffect**

```typescript
// Remove lines 95, 99, and 110:
// Line 95: console.log("[VerifyEmail] Starting verification with token:", token)
// Line 99: console.log("[VerifyEmail] Success handler with data:", data)
// Line 110: console.log("[VerifyEmail] Error handler with error:", err)

// After removal, the code should be:
verifyEmail
    .mutateAsync({ token })
    .then((data) => {
        setState({ status: "success" })
        if (data.data.token) {
            localStorage.setItem(AUTH.TOKEN_KEY, data.data.token)
        }
        // Navigate after 2 seconds
        setTimeout(() => {
            navigate({ to: "/dashboard" })
        }, 2000)
    })
    .catch((err) => {
        const error = err as ApiError
        // ... rest of error handling without console.log
```

- [ ] **Step 2: Type check**

Run: `cd apps/web && bun check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/verify-email.tsx
git commit -m "fix(auth): remove debug logs containing tokens from verify-email page"
```

---

### Task 10: Normalize Login Email in LoginSchema

**Files:**
- Modify: `packages/shared/src/validators/auth.ts:16`

**Problem:** LoginSchema doesn't trim email like RegisterSchema does, causing mismatch.

- [ ] **Step 1: Add .trim() to LoginSchema.email**

```typescript
// Line 16: Change from:
email: z.string().email("Please enter a valid email address"),

// To:
email: z.string().trim().email("Please enter a valid email address"),
```

- [ ] **Step 2: Rebuild shared package**

Run: `cd packages/shared && bun run build`
Expected: Build succeeds

- [ ] **Step 3: Type check web app**

Run: `cd apps/web && bun check`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/validators/auth.ts
git commit -m "fix(shared): normalize login email with trim() for consistency"
```

---

### Task 11: Add DB Constraints for Consumed Token State

**Files:**
- Modify: `packages/db/src/schema/client.ts:11-19`

**Problem:** consumed_by_client_id has no FK constraint; no CHECK for state consistency.

- [ ] **Step 1: Add foreign key and check constraint to pending_registrations table**

```typescript
// Lines 11-19: Change from:
export const pendingRegistrations = pgTable("pending_registrations", {
    token: uuid("token").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    consumedByClientId: uuid("consumed_by_client_id"),
})

// To:
export const pendingRegistrations = pgTable("pending_registrations", {
    token: uuid("token").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    consumedByClientId: uuid("consumed_by_client_id").references(() => clients.id),
}, (table) => ({
    // CHECK constraint: either both consumedAt and consumedByClientId are NULL, or both are NOT NULL
    consumedStateCheck: sql`CHECK (
        (${table.consumedAt} IS NULL AND ${table.consumedByClientId} IS NULL) OR
        (${table.consumedAt} IS NOT NULL AND ${table.consumedByClientId} IS NOT NULL)
    )`,
}))

// Note: Need to import sql from drizzle-orm at top of file if not already
// Add: import { sql } from "drizzle-orm"
```

- [ ] **Step 2: Type check db package**

Run: `cd packages/db && bun check`
Expected: No errors

- [ ] **Step 3: Commit (migrations generated separately)**

```bash
git add packages/db/src/schema/client.ts
git commit -m "fix(db): add FK and CHECK constraints to pending_registrations"
```

---

### Task 12: Replace Fixed 50ms Retry with Polling Loop

**Files:**
- Modify: `apps/api/src/modules/auth/auth.service.ts:58-79`

**Problem:** Single 50ms sleep may not be enough for concurrent transaction completion.

- [ ] **Step 1: Replace fixed delay with polling loop**

```typescript
// Lines 58-79: Change from:
if (err instanceof Error && err.message === "EMAIL_TAKEN") {
    // Small delay to let the concurrent transaction complete
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Try to find the client that was just created by checking the consumed token
    const pending = await this.repo.findPendingByToken(token)
    if (pending?.consumedByClientId) {
        const client = await this.repo.findClientById(
            pending.consumedByClientId,
        )
        if (client) {
            await this.repo.updateLastActive(client.id)
            return signToken({
                sub: client.id,
                role: "client",
            })
        }
    }

    // If we can't find the client, the email really is taken by someone else
    throw new Error("EMAIL_ALREADY_VERIFIED")
}

// To:
if (err instanceof Error && err.message === "EMAIL_TAKEN") {
    // Poll for concurrent transaction completion (up to 5 attempts, 25ms apart)
    for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 25))

        const pending = await this.repo.findPendingByToken(token)
        if (pending?.consumedByClientId) {
            const client = await this.repo.findClientById(
                pending.consumedByClientId,
            )
            if (client) {
                await this.repo.updateLastActive(client.id)
                return signToken({
                    sub: client.id,
                    role: "client",
                })
            }
        }
    }

    // If we can't find the client after polling, the email really is taken
    throw new Error("EMAIL_ALREADY_VERIFIED")
}
```

- [ ] **Step 2: Run auth tests to verify**

Run: `cd apps/api && bun test src/modules/auth/auth.test.ts`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/auth/auth.service.ts
git commit -m "fix(auth): replace fixed retry delay with polling for concurrent registration"
```

---

### Task 13: Remove Outlet from BackofficeLayout Children

**Files:**
- Modify: `apps/web/src/routes/backoffice.tsx:25-29`

**Problem:** Outlet passed as children but BackofficeLayout already renders its own Outlet.

- [ ] **Step 1: Remove Outlet from children, pass as self-closing component**

```typescript
// Lines 25-29: Change from:
return (
    <BackofficeLayout>
        <Outlet />
    </BackofficeLayout>
)

// To:
return <BackofficeLayout />
```

**Wait - this is incorrect.** Looking at the BackofficeLayout component, it receives children. The issue is that BackofficeLayout has its own Outlet inside it. Let me check...

Actually, BackofficeLayout.tsx (line 95) has `<Outlet />` hardcoded inside it. So passing children creates a mismatch where children are ignored.

The correct fix is:
1. Option A: Remove children and use BackofficeLayout as self-closing (but layout won't know about route context)
2. Option B: Remove the hardcoded Outlet from BackofficeLayout and let it render children

Looking at the DashboardLayout pattern, it also has `<Outlet />` inside. So the pattern is correct - layout routes render Outlet internally.

The issue is that `backoffice.tsx` route file is passing `<Outlet />` as children, which is redundant.

The fix is to NOT pass children:

```typescript
// If BackofficeLayout expects children and renders them (not Outlet), we pass Outlet
// If BackofficeLayout renders Outlet internally, we pass nothing

// Looking at BackofficeLayout.tsx line 95: it has <Outlet />
// So we should NOT pass Outlet as children

return <BackofficeLayout />
```

- [ ] **Step 2: Type check**

Run: `cd apps/web && bun check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/backoffice.tsx
git commit -m "fix(web): remove redundant Outlet from BackofficeLayout children"
```

---

### Task 14: Fix Resend Cooldown to Start Only on Success

**Files:**
- Modify: `apps/web/src/routes/verify-email.tsx:66-78`

**Problem:** Cooldown starts before request completes; no error handling on failure.

- [ ] **Step 1: Move cooldown into onSuccess and add onError handler**

```typescript
// Lines 66-78: Change from:
const handleResend = () => {
    if (!resendEmail || !canResend) return
    setCanResend(false)
    setResendTimeout(60)
    resendVerification.mutate(
        { email: resendEmail },
        {
            onSuccess: () => {
                setResendSuccess(true)
            },
        },
    )
}

// To:
const handleResend = () => {
    if (!resendEmail || !canResend) return
    resendVerification.mutate(
        { email: resendEmail },
        {
            onSuccess: () => {
                setResendSuccess(true)
                setCanResend(false)
                setResendTimeout(60)
            },
            onError: () => {
                // Keep canResend true so user can retry immediately
                setResendSuccess(false)
            },
        },
    )
}
```

- [ ] **Step 2: Type check**

Run: `cd apps/web && bun check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/verify-email.tsx
git commit -m "fix(web): start resend cooldown only on success and add error handling"
```

---

## Final Verification

After all tasks are complete:

- [ ] **Run full type check**

```bash
cd D:\MUNI\weby\pb138
bun run check
```

Expected: No type errors across all packages

- [ ] **Run all tests**

```bash
cd D:\MUNI\weby\pb138
bun run test
```

Expected: All tests pass

- [ ] **Build shared package**

```bash
cd packages/shared && bun run build
```

Expected: Build succeeds

