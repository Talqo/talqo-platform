# Email Verification Token Consumption Fix

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix email verification in React StrictMode by tracking consumed tokens and treating re-verification of consumed tokens as success.

**Architecture:** Instead of deleting tokens after verification, mark them with `consumedAt` and `consumedByClientId`. On subsequent verification attempts, if token is already consumed, return success with the client's JWT token (auto-login behavior).

**Tech Stack:** TypeScript, Drizzle ORM, Hono, React

---

## Task 1: Update Repository Interface and Types

**Files:**
- Modify: `apps/api/src/modules/auth/auth.repository.ts:17-27`

**Current Issue:** `PendingRegistration` type already includes `consumedAt` and `consumedByClientId` but they're optional and unused.

- [ ] **Step 1: Update PendingRegistration type to make consumed fields required when present**

No code change needed to the type - it's already correct. Move to next task.

---

## Task 2: Update InMemoryAuthRepository.consumePendingRegistration

**Files:**
- Modify: `apps/api/src/modules/auth/auth.repository.ts:134-148`

- [ ] **Step 1: Change implementation to mark as consumed instead of delete**

Replace the `consumePendingRegistration` method in `InMemoryAuthRepository`:

```typescript
async consumePendingRegistration(token: string): Promise<Client> {
	const record = this.pendingRegistrations.get(token)
	if (!record) throw new Error("INVALID_TOKEN")
	if (record.expiresAt < new Date()) throw new Error("TOKEN_EXPIRED")

	// If already consumed, return the existing client (idempotent)
	if (record.consumedAt && record.consumedByClientId) {
		const existingClient = this.clients.get(record.consumedByClientId)
		if (existingClient) return existingClient
		// If client somehow missing, continue to recreate (shouldn't happen)
	}

	// createClient throws EMAIL_TAKEN on duplicate; the token stays intact so
	// the caller can detect the conflict and retry or surface an error.
	const client = await this.createClient({
		name: record.name,
		email: record.email,
		passwordHash: record.passwordHash,
	})

	// Mark as consumed instead of deleting (preserves token for idempotency)
	record.consumedAt = new Date()
	record.consumedByClientId = client.id
	this.pendingRegistrations.set(token, record)

	return client
}
```

- [ ] **Step 2: Commit the change**

```bash
git add apps/api/src/modules/auth/auth.repository.ts
git commit -m "feat(auth): mark tokens as consumed instead of deleting in memory repo"
```

---

## Task 3: Update DrizzleAuthRepository.consumePendingRegistration

**Files:**
- Modify: `apps/api/src/modules/auth/auth.repository.ts:246-279`

- [ ] **Step 1: Change implementation to mark as consumed instead of delete**

Replace the `consumePendingRegistration` method in `DrizzleAuthRepository`:

```typescript
async consumePendingRegistration(token: string): Promise<Client> {
	return this.db.transaction(async (tx) => {
		const [pending] = await tx
			.select()
			.from(pendingRegistrations)
			.where(eq(pendingRegistrations.token, token))

		if (!pending) throw new Error("INVALID_TOKEN")
		if (pending.expiresAt < new Date()) throw new Error("TOKEN_EXPIRED")

		// If already consumed, return the existing client (idempotent)
		if (pending.consumedAt && pending.consumedByClientId) {
			const existingClient = await this.findClientById(pending.consumedByClientId)
			if (existingClient) return existingClient
			// If client somehow missing, continue to create new one
		}

		let client: Client
		try {
			const rows = await tx
				.insert(clients)
				.values({
					name: pending.name,
					email: pending.email,
					passwordHash: pending.passwordHash,
				})
				.returning()
			// biome-ignore lint/style/noNonNullAssertion: insert always returns one row
			client = mapClient(rows[0]!)
		} catch (err) {
			if (isUniqueViolation(err)) throw new Error("EMAIL_TAKEN")
			throw err
		}

		// Mark as consumed instead of deleting (preserves token for idempotency)
		await tx
			.update(pendingRegistrations)
			.set({
				consumedAt: new Date(),
				consumedByClientId: client.id,
			})
			.where(eq(pendingRegistrations.token, token))

		return client
	})
}
```

- [ ] **Step 2: Commit the change**

```bash
git add apps/api/src/modules/auth/auth.repository.ts
git commit -m "feat(auth): mark tokens as consumed instead of deleting in drizzle repo"
```

---

## Task 4: Update AuthService to handle EMAIL_TAKEN as success

**Files:**
- Modify: `apps/api/src/modules/auth/auth.service.ts:40-62`

The service currently catches `EMAIL_TAKEN` and throws `EMAIL_ALREADY_VERIFIED`. But now, since we mark tokens as consumed first, and a consumed token re-verification will find the existing client and return it (not throw EMAIL_TAKEN). However, there's a race condition window where two requests could both try to create the client simultaneously.

In that race condition:
1. Request A: finds pending, creates client, marks consumed
2. Request B: finds pending (not yet marked consumed), tries to insert client, gets unique violation (EMAIL_TAKEN)

We need to handle this by checking if the token was consumed by the concurrent request.

- [ ] **Step 1: Update verifyEmail to handle race conditions**

Replace the `verifyEmail` method in `AuthService`:

```typescript
async verifyEmail(token: string): Promise<string> {
	try {
		// consumePendingRegistration atomically validates the token, creates the
		// Client, and marks the pending registration as consumed in one repo transaction.
		// If already consumed, returns the existing client (idempotent - handles StrictMode double-mount).
		const client = await this.repo.consumePendingRegistration(token)

		// Update last active timestamp
		await this.repo.updateLastActive(client.id)

		// Return JWT token for auto-login
		return signToken({
			sub: client.id,
			role: "client",
		})
	} catch (err) {
		// EMAIL_TAKEN means a client with this email was already created by a concurrent request.
		// The token may now be marked as consumed. Retry once to get the client.
		if (err instanceof Error && err.message === "EMAIL_TAKEN") {
			// Small delay to let the concurrent transaction complete
			await new Promise((resolve) => setTimeout(resolve, 50))

			// Try to find the client that was just created
			const pending = await this.repo.findPendingByToken(token)
			if (pending?.consumedByClientId) {
				const client = await this.repo.findClientById(pending.consumedByClientId)
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
		throw err
	}
}
```

- [ ] **Step 2: Add findPendingByToken to repository interface**

Add to `IAuthRepository` interface after line 37:

```typescript
// Find pending registration by token
findPendingByToken(token: string): Promise<PendingRegistration | null>
```

- [ ] **Step 3: Implement findPendingByToken in InMemoryAuthRepository**

Add after line 94:

```typescript
async findPendingByToken(token: string): Promise<PendingRegistration | null> {
	return this.pendingRegistrations.get(token) ?? null
}
```

- [ ] **Step 4: Implement findPendingByToken in DrizzleAuthRepository**

Add after line 206:

```typescript
async findPendingByToken(token: string): Promise<PendingRegistration | null> {
	const rows = await this.db
		.select()
		.from(pendingRegistrations)
		.where(eq(pendingRegistrations.token, token))
	return rows[0] ?? null
}
```

- [ ] **Step 5: Commit the changes**

```bash
git add apps/api/src/modules/auth/auth.service.ts apps/api/src/modules/auth/auth.repository.ts
git commit -m "feat(auth): handle race conditions and make verification idempotent"
```

---

## Task 5: Verify Frontend Navigation Works

**Files:**
- Read: `apps/web/src/routes/verify-email.tsx:50-61`

The frontend already navigates to `/dashboard` after successful verification. Check that it's working correctly.

- [ ] **Step 1: Verify navigation code is correct**

The code at lines 53-60 should be:
```typescript
onSuccess: (data) => {
	setState({ status: "success" })
	if (data.data.token) {
		localStorage.setItem(AUTH.TOKEN_KEY, data.data.token)
	}
	// Navigate after 2 seconds
	setTimeout(() => {
		navigate({ to: "/dashboard" })
	}, 2000)
},
```

This is already correct. The navigation happens after storing the token and waiting 2 seconds, giving the user time to see the success message.

---

## Task 6: Run Tests

- [ ] **Step 1: Run API tests**

```bash
cd apps/api
bun test
```

Expected: All tests pass.

- [ ] **Step 2: Run type checking**

```bash
bun run check
```

Expected: No TypeScript errors.

- [ ] **Step 3: Commit if all tests pass**

```bash
git commit -m "test: verify email verification idempotency fix"
```

---

## Task 7: Manual Testing Checklist

Test the following scenarios:

- [ ] **Scenario 1: Normal verification**
  1. Register a new account
  2. Click verification link
  3. Should see success message
  4. Should be redirected to dashboard after 2 seconds
  5. Should be logged in (token in localStorage)

- [ ] **Scenario 2: Double verification (simulates StrictMode)**
  1. Register a new account
  2. Click verification link
  3. Quickly refresh the page (or trigger another verification call)
  4. Both calls should succeed
  5. Should be redirected to dashboard

- [ ] **Scenario 3: Already verified email**
  1. Register and verify an account
  2. Try to use the same verification link again
  3. Should succeed (idempotent) and redirect to dashboard

- [ ] **Scenario 4: Expired token**
  1. Wait for token to expire (or manually expire in DB)
  2. Try to verify
  3. Should show error with option to register again

---

## Summary of Changes

1. **Repository layer**: Changed from `DELETE` to `UPDATE` with `consumedAt` and `consumedByClientId`
2. **Service layer**: Added race-condition handling with retry logic
3. **Interface**: Added `findPendingByToken` method to support retry logic

The key insight is that marking tokens as consumed (instead of deleting) allows us to:
1. Detect when a token was already used (idempotent success)
2. Handle race conditions where two requests try to verify simultaneously
3. Support React StrictMode's double-mount behavior naturally
