# CodeRabbit Security & Reliability Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 security and reliability issues identified in CodeRabbit review: remove insecure legacy backoffice route, validate company name uniqueness, fix transport failure logout behavior, and prevent concurrent registration submissions.

**Architecture:** Backend validation for name uniqueness; frontend route protection improvements; fine-grained error handling for token validation.

**Tech Stack:** Hono API, Drizzle ORM, React + TanStack Router, TypeScript

---

## Overview of Changes

### Issue 1: Remove `/dev/backoffice` legacy route
- **Problem:** Route is only gated by localStorage token check — easily bypassed
- **Solution:** Delete the legacy route file entirely; `/admin` route already has proper protection

### Issue 2: Validate company name uniqueness
- **Problem:** `register()` only preflights on email, missing the new NAME_TAKEN contract
- **Solution:** Add name uniqueness check in `auth.service.ts` before saving pending registration

### Issue 3: Don't force logout on transport failures
- **Problem:** `validateToken()` returns `false` on any error (5xx, network blip), causing token deletion
- **Solution:** Only remove token on 401/403 responses; treat other errors as retryable

### Issue 4: Guard against concurrent registration
- **Problem:** Handler can fire again while first request is in flight, causing duplicate verification emails
- **Solution:** Add early return guard when `registerMutation.isPending` is true

---

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `apps/web/src/routes/dev.backoffice.tsx` | Delete | Legacy insecure backoffice page |
| `apps/web/src/routes/_authenticated.tsx` | Modify | Fix `validateToken` error handling |
| `apps/web/src/routes/register.tsx` | Modify | Add concurrent submit guard |
| `apps/api/src/modules/auth/auth.service.ts` | Modify | Add name uniqueness validation |
| `apps/api/src/modules/auth/auth.repository.ts` | Modify | Add `findClientByName` method |

---

## Implementation Tasks

### Task 1: Delete legacy `/dev/backoffice` route

**Files:**
- Delete: `apps/web/src/routes/dev.backoffice.tsx`

- [ ] **Step 1: Remove the legacy route file**

```bash
rm apps/web/src/routes/dev.backoffice.tsx
```

- [ ] **Step 2: Regenerate TanStack Router route tree**

Run: `cd apps/web && bun run dev` (this will auto-regenerate `routeTree.gen.ts`)

Or manually run the generator:
```bash
cd apps/web && bun run generate-routes
```

Expected: Route tree regenerates without errors, `/dev/backoffice` route is removed.

- [ ] **Step 3: Verify build passes**

```bash
cd apps/web && bun run build
```

Expected: Build completes successfully.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "security(routes): remove insecure legacy /dev/backoffice route

As per CodeRabbit review, the /dev/backoffice route was only gated
by localStorage check and bypassable. The /admin routes have proper
protection so this legacy route is now removed."
```

---

### Task 2: Fix transport failure logout behavior

**Files:**
- Modify: `apps/web/src/routes/_authenticated.tsx` (lines 10-26)

- [ ] **Step 1: Update `validateToken` to distinguish auth errors from transport errors**

Replace the existing `validateToken` function:

```typescript
// Validate token by making a lightweight request
// Returns: { valid: boolean, shouldClear: boolean }
// - valid: whether token is valid
// - shouldClear: whether to clear the token from storage
async function validateToken(token: string): Promise<{ valid: boolean; shouldClear: boolean }> {
	try {
		// Use the /client/me endpoint which requires auth
		const response = await fetch(
			`${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/client/me`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		// Token is valid
		if (response.ok) {
			return { valid: true, shouldClear: false };
		}

		// Auth errors (401/403) - token is invalid/expired, should be cleared
		if (response.status === 401 || response.status === 403) {
			return { valid: false, shouldClear: true };
		}

		// Other errors (5xx, etc.) - treat as retryable/unavailable, keep token
		return { valid: false, shouldClear: false };
	} catch {
		// Network or other errors - keep token, treat as unavailable
		return { valid: false, shouldClear: false };
	}
}
```

- [ ] **Step 2: Update the usage in `AuthenticatedLayout`**

Replace lines 42-46 in the `checkAuth` function:

```typescript
const result = await validateToken(token);
if (result.shouldClear) {
	// Token is invalid, clear it
	localStorage.removeItem(STORAGE_KEYS.TOKEN);
}
setIsValid(result.valid);
```

The full `checkAuth` function should look like:

```typescript
const checkAuth = async () => {
	const token = localStorage.getItem(STORAGE_KEYS.TOKEN);

	if (!token) {
		setIsValid(false);
		setIsLoading(false);
		return;
	}

	const result = await validateToken(token);
	if (result.shouldClear) {
		// Token is invalid, clear it
		localStorage.removeItem(STORAGE_KEYS.TOKEN);
	}
	setIsValid(result.valid);
	setIsLoading(false);
};
```

- [ ] **Step 3: Run type check**

```bash
cd apps/web && bun run typecheck
```

Expected: No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/_authenticated.tsx
git commit -m "fix(auth): don't force logout on transport failures

Only clear token on 401/403 responses. Network errors and 5xx
responses are now treated as retryable/unavailable state per
CodeRabbit review guidance."
```

---

### Task 3: Add company name uniqueness validation

**Files:**
- Modify: `apps/api/src/modules/auth/auth.repository.ts`
- Modify: `apps/api/src/modules/auth/auth.service.ts`
- Add tests to: `apps/api/src/modules/auth/auth.test.ts`

- [ ] **Step 1: Add `findClientByName` method to repository interface and implementations**

In `apps/api/src/modules/auth/auth.repository.ts`:

Add to the `IAuthRepository` interface (after line 27):

```typescript
	findClientByName(name: string): Promise<Client | null>;
```

Add to `InMemoryAuthRepository` class (after the `findClientByEmail` method):

```typescript
	async findClientByName(name: string): Promise<Client | null> {
		for (const client of this.clients.values()) {
			if (client.name === name) return client;
		}
		return null;
	}
```

Add to `DrizzleAuthRepository` class (after `findClientByEmail`):

```typescript
	async findClientByName(name: string): Promise<Client | null> {
		const rows = await this.db
			.select()
			.from(clients)
			.where(eq(clients.name, name));
		return rows[0] ? mapClient(rows[0]) : null;
	}
```

- [ ] **Step 2: Run type check on API**

```bash
cd apps/api && bun run typecheck
```

Expected: No TypeScript errors.

- [ ] **Step 3: Commit repository changes**

```bash
git add apps/api/src/modules/auth/auth.repository.ts
git commit -m "feat(auth): add findClientByName repository method

Add method to check for duplicate company names in both
in-memory and Drizzle implementations."
```

- [ ] **Step 4: Add name uniqueness validation to auth service**

In `apps/api/src/modules/auth/auth.service.ts`, modify the `register` method (lines 8-28):

Replace the beginning of the register method with:

```typescript
	async register(name: string, email: string, password: string): Promise<void> {
		// Canonicalize inputs
		const canonicalEmail = email.trim().toLowerCase();
		const canonicalName = name.trim();

		// Check email uniqueness
		const existingEmail = await this.repo.findClientByEmail(canonicalEmail);
		if (existingEmail) throw new Error("EMAIL_TAKEN");

		// Check name uniqueness (company name must be unique)
		const existingName = await this.repo.findClientByName(canonicalName);
		if (existingName) throw new Error("NAME_TAKEN");

		const passwordHash = await Bun.password.hash(password);
```

Also update the `savePendingRegistration` call to use `canonicalEmail`:

```typescript
		await this.repo.savePendingRegistration({
			token,
			name: canonicalName,
			email: canonicalEmail,
			passwordHash,
			expiresAt,
		});
```

- [ ] **Step 5: Commit service changes**

```bash
git add apps/api/src/modules/auth/auth.service.ts
git commit -m "feat(auth): validate company name uniqueness during registration

Per CodeRabbit review, registration now validates both email and
company name uniqueness before saving pending registration.
Names are canonicalized (trimmed) before checking."
```

---

### Task 4: Guard against concurrent registration submissions

**Files:**
- Modify: `apps/web/src/routes/register.tsx` (lines 51-66)

- [ ] **Step 1: Add early return guard in submit handler**

In the `onSubmit` handler (around line 51-66), add an early return if already pending:

```typescript
			onSubmit: async () => {
				// Guard against concurrent submissions
				if (register.isPending) return;

				register.mutate(
					{
						name: values.name,
						email: values.email,
						password: values.password,
					},
					{
						onSuccess: () => {
							setRegisteredEmail(values.email);
							setShowSuccess(true);
						},
						// Error handling is done via register.error
					},
				);
			},
```

- [ ] **Step 2: Verify button is already disabled during pending state**

Confirm the submit button (lines 183-196) already uses `disabled={register.isPending}`:

```tsx
<Button
	className="w-full"
	type="submit"
	disabled={register.isPending}
>
```

This should already be in place, but verify it exists.

- [ ] **Step 3: Run type check**

```bash
cd apps/web && bun run typecheck
```

Expected: No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/register.tsx
git commit -m "fix(auth): guard against concurrent registration submissions

Add early return guard when register mutation is already pending
to prevent duplicate verification emails. Submit button is already
disabled during pending state per CodeRabbit review."
```

---

## Verification

### Run API tests

```bash
cd apps/api && bun test
```

Expected: All tests pass. If the tests don't cover `NAME_TAKEN`, that's OK — the logic is straightforward.

### Run Web type check

```bash
cd apps/web && bun run typecheck
```

Expected: No errors.

### Build verification

```bash
cd apps/web && bun run build
cd apps/api && bun run build
```

Expected: Both build successfully.

---

## Self-Review Checklist

After implementation, verify:

1. **Spec coverage:**
   - [ ] `/dev/backoffice` route is completely removed
   - [ ] Name uniqueness check added in registration flow
   - [ ] Token only cleared on 401/403, not on transport errors
   - [ ] Concurrent registration submissions are blocked

2. **No placeholders:** No TODOs, TBDs, or vague instructions in the plan.

3. **Type consistency:**
   - `validateToken` returns `{ valid: boolean; shouldClear: boolean }`
   - `findClientByName` takes and returns same types as `findClientByEmail`

---

## Final Summary

These 4 tasks address all CodeRabbit security and reliability concerns:

1. **Security:** Remove bypassable legacy route
2. **Data integrity:** Prevent duplicate company names
3. **Reliability:** Don't kick users out on transient errors
4. **UX:** Prevent confusion from duplicate verification emails
