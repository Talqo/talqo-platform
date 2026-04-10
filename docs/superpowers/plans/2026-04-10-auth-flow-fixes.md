# Auth Flow Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the remaining auth verification flow issues: ensure resend email button is visible on error state, fix auto-redirect after verification, and restore auth tests from pre-SCRUM-40 state.

**Architecture:** The auth flow uses React Query mutations for API calls, React Router for navigation, and TanStack Router's search params to extract the verification token from the URL.

**Tech Stack:** React, TypeScript, TanStack Router, TanStack Query, Hono API, Bun:test

---

## Issue Analysis

The user reports two issues:
1. **Resend email button not visible** - The button should appear when verification fails with INVALID_TOKEN, TOKEN_EXPIRED, or MISSING_TOKEN errors
2. **Stuck on "Verifying your email" loading screen** - The page doesn't transition from loading state to error state properly

Both issues are in `apps/web/src/routes/verify-email.tsx`.

The code shows the resend form should display (lines 143-146: `showResendForm` logic) but there may be issues with:
- The error format returned from the API
- The error handling in the mutation's onError callback
- React StrictMode double-mount interaction with the useEffect

---

## Task 1: Debug and Fix Error Handling in verify-email.tsx

**Files:**
- Debug: `apps/web/src/routes/verify-email.tsx`
- Compare: `apps/api/src/modules/auth/auth.routes.ts` GET /verify-email error responses

**Issue:** The frontend expects errors in format `{ error: { code: string, message: string } }` but the API might be returning a different structure.

- [ ] **Step 1.1: Check API error response format**

Look at `apps/api/src/modules/auth/auth.routes.ts` lines 138-175. The error responses return:
```typescript
{ success: false, error: { code: err.message, message: "..." } }
```

Verify this matches what the frontend expects in verify-email.tsx line 68:
```typescript
const code = error.error?.code || "UNKNOWN_ERROR"
```

- [ ] **Step 1.2: Add detailed error logging**

Add console.log in verify-email.tsx line 67 to see the actual error structure:
```typescript
onError: (error) => {
    console.log("Verification error:", JSON.stringify(error, null, 2))
    const code = error.error?.code || "UNKNOWN_ERROR"
    // ... rest of code
}
```

- [ ] **Step 1.3: Check if error is being thrown properly**

In `apps/web/src/api/hooks/useAuth.ts` lines 72-85, check the useVerifyEmail hook:

```typescript
export function useVerifyEmail() {
	return useMutation<AuthResponse, ApiError, { token: string }>({
		mutationFn: async ({ token }) => {
			const { data, error } = await client.GET("/auth/verify-email", {
				params: { query: { token } },
			})
			if (error) throw error  // <-- error is thrown here
			return data as AuthResponse
		},
	})
}
```

The error type is `ApiError` which expects:
```typescript
interface ApiError {
	success: false
	error: { code: string; message: string }
}
```

Verify the API client returns errors in this exact format.

- [ ] **Step 1.4: Test the actual error format**

Run the API and test the endpoint directly:
```bash
cd apps/api && bun run test src/modules/auth/auth.test.ts
```

Or make a manual request to see the error format:
```bash
curl "http://localhost:3000/auth/verify-email?token=invalid-token"
```

- [ ] **Step 1.5: Fix any mismatched error handling**

If the API returns errors differently than expected (e.g., nested differently or with different field names), either:
- Fix the useVerifyEmail hook to transform the error
- Or fix the API to return the expected format

The correct format should be:
```typescript
{ success: false, error: { code: "INVALID_TOKEN" | "TOKEN_EXPIRED" | "EMAIL_ALREADY_VERIFIED", message: "..." } }
```

- [ ] **Step 1.6: Fix hasAttempted ref logic issue**

The current code uses a ref to guard against React StrictMode double-mount. The issue is that if the component unmounts and remounts (which StrictMode does), the ref persists but the state resets to "loading", causing the user to be stuck.

**Change:** Instead of using a ref, we should check if the token is already being processed or add proper cleanup:

```typescript
// Modify the useEffect to not rely solely on hasAttempted
useEffect(() => {
	if (!token) {
		setState({ status: "error", code: "MISSING_TOKEN", message: "..." })
		return
	}

	// Only proceed if we're in loading state (prevents re-running after error/success)
	if (state.status !== "loading") return

	// Call verify endpoint
	verifyEmail.mutate({ token }, { ... })
}, [token, verifyEmail, navigate, state.status])
```

- [ ] **Step 1.7: Commit fixes**

```bash
git add apps/web/src/routes/verify-email.tsx
git commit -m "fix(auth): fix error handling and StrictMode double-mount in verify-email"
```

---

## Task 2: Fix Auto-Redirect After Verification Success

**Files:**
- Modify: `apps/web/src/routes/verify-email.tsx`
- Check: `apps/web/src/lib/constants.ts` for AUTH constants

**Issue:** The success state shows "Redirecting to login..." but redirects to `/dashboard` (lines 63-65). Also, the user reported they want redirect to dashboard.

Current behavior:
```typescript
setTimeout(() => {
	navigate({ to: "/dashboard" })
}, 2000)
```

But the message says "Redirecting to login..." which is confusing.

- [ ] **Step 2.1: Update success message to match behavior**

In verify-email.tsx line 129, change:
```typescript
// From:
Your email has been verified successfully. Redirecting to login...

// To:
Your email has been verified successfully. Redirecting to dashboard...
```

- [ ] **Step 2.2: Ensure dashboard route exists**

Verify that `/dashboard` route exists in `apps/web/src/routes/_authenticated/dashboard.tsx` or similar.

- [ ] **Step 2.3: Commit the fix**

```bash
git add apps/web/src/routes/verify-email.tsx
git commit -m "fix(auth): update success message to match dashboard redirect"
```

---

## Task 3: Restore Email Service Test File

**Files:**
- Restore: `apps/api/src/common/email/email.service.test.ts` (deleted in commit 5b07fbe)

**Issue:** The email.service.test.ts was removed in commit 5b07fbe but the user wants it restored with proper formatting.

Original file content from commit 5b07fbe^ (parent of the deletion):

- [ ] **Step 3.1: Create the test file**

Create `apps/api/src/common/email/email.service.test.ts`:

```typescript
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	mock,
} from "bun:test"

type SendPayload = { from: string; to: string; subject: string; html: string }
type SendResult = {
	data: { id: string } | null
	error: { message: string; name: string } | null
}

// Mock the resend module before any imports
const mockSend = mock(
	async (_payload: SendPayload): Promise<SendResult> => ({
		data: { id: "test-id" },
		error: null,
	}),
)

mock.module("resend", () => ({
	Resend: class MockResend {
		emails = { send: mockSend }
	},
}))

// Import the service after mocking
type EmailService = {
	sendVerificationEmail: (to: string, token: string) => Promise<void>
	sendPasswordResetEmail: (to: string, token: string) => Promise<void>
	sendQuotaAlertEmail: (to: string, percentage: number) => Promise<void>
}

// Load the module dynamically after mock is set up
let emailService: EmailService

describe("email.service", () => {
	beforeAll(async () => {
		// Ensure env vars are set before importing
		process.env.RESEND_API_KEY = "test-api-key"
		process.env.APP_URL = "http://localhost:5173"

		const mod = await import("./email.service")
		emailService = {
			sendVerificationEmail: mod.sendVerificationEmail,
			sendPasswordResetEmail: mod.sendPasswordResetEmail,
			sendQuotaAlertEmail: mod.sendQuotaAlertEmail,
		}
	})

	beforeEach(() => {
		mockSend.mockClear()
	})

	afterEach(() => {
		delete process.env.RESEND_API_KEY
		delete process.env.APP_URL
	})

	describe("sendVerificationEmail", () => {
		it("sends verification email with correct parameters", async () => {
			process.env.RESEND_API_KEY = "test-api-key"
			process.env.APP_URL = "http://localhost:5173"

			await emailService.sendVerificationEmail("test@example.com", "token123")

			expect(mockSend).toHaveBeenCalledTimes(1)
			const call = mockSend.mock.calls[0] as [SendPayload]
			expect(call[0].to).toBe("test@example.com")
			expect(call[0].subject).toBe("Verify your email address")
			expect(call[0].html).toContain("token123")
			expect(call[0].html).toContain("http://localhost:5173/verify-email")
		})

		it("throws error when RESEND_API_KEY is missing", async () => {
			delete process.env.RESEND_API_KEY
			process.env.APP_URL = "http://localhost:5173"

			await expect(
				emailService.sendVerificationEmail("test@example.com", "token123"),
			).rejects.toThrow("RESEND_API_KEY not configured")
		})

		it("throws error when APP_URL is missing", async () => {
			process.env.RESEND_API_KEY = "test-api-key"
			delete process.env.APP_URL

			await expect(
				emailService.sendVerificationEmail("test@example.com", "token123"),
			).rejects.toThrow("APP_URL not configured")
		})
	})

	describe("sendPasswordResetEmail", () => {
		it("sends password reset email with correct parameters", async () => {
			process.env.RESEND_API_KEY = "test-api-key"
			process.env.APP_URL = "http://localhost:5173"

			await emailService.sendPasswordResetEmail("test@example.com", "reset-token")

			expect(mockSend).toHaveBeenCalledTimes(1)
			const call = mockSend.mock.calls[0] as [SendPayload]
			expect(call[0].to).toBe("test@example.com")
			expect(call[0].subject).toBe("Reset your password")
			expect(call[0].html).toContain("reset-token")
			expect(call[0].html).toContain("http://localhost:5173/reset-password")
		})
	})

	describe("sendQuotaAlertEmail", () => {
		it("sends quota alert email with correct percentage", async () => {
			process.env.RESEND_API_KEY = "test-api-key"
			process.env.FROM_EMAIL = "alerts@example.com"

			await emailService.sendQuotaAlertEmail("test@example.com", 85)

			expect(mockSend).toHaveBeenCalledTimes(1)
			const call = mockSend.mock.calls[0] as [SendPayload]
			expect(call[0].to).toBe("test@example.com")
			expect(call[0].subject).toBe("Usage Quota Alert: 85%")
			expect(call[0].html).toContain("85%")
		})

		it("throws error when FROM_EMAIL is missing", async () => {
			process.env.RESEND_API_KEY = "test-api-key"
			delete process.env.FROM_EMAIL

			await expect(
				emailService.sendQuotaAlertEmail("test@example.com", 85),
			).rejects.toThrow("FROM_EMAIL not configured")
		})
	})
})
```

- [ ] **Step 3.2: Run the test to ensure it passes**

```bash
cd apps/api && bun test src/common/email/email.service.test.ts
```

Expected: Tests should pass (or at least run). If they fail due to mocking issues, they can be marked as TODO.

- [ ] **Step 3.3: Commit the restored test**

```bash
git add apps/api/src/common/email/email.service.test.ts
git commit -m "test(email): restore email.service.test.ts from pre-SCRUM-40"
```

---

## Task 4: Verify auth.test.ts Tests Are Complete

**Files:**
- Check: `apps/api/src/modules/auth/auth.test.ts`

The current auth.test.ts already has tests but check if any are missing from pre-SCRUM-40 state.

- [ ] **Step 4.1: Run existing auth tests**

```bash
cd apps/api && bun test src/modules/auth/auth.test.ts
```

Expected: All tests should pass.

- [ ] **Step 4.2: Check for missing test cases**

Compare current test file with the state before any SCRUM-40 changes. Look for any removed test cases.

The current test file has:
- POST /auth/register tests
- GET /auth/verify-email tests
- POST /auth/login tests

Missing that should be added:
- POST /auth/resend-verification tests

- [ ] **Step 4.3: Add resend-verification tests**

Add to `apps/api/src/modules/auth/auth.test.ts` after line 321:

```typescript
describe("POST /auth/resend-verification", () => {
	let app: ReturnType<typeof buildApp>

	beforeEach(() => {
		app = buildApp()
		mockSendVerificationEmail.mockClear()
	})

	it("returns 200 and resends verification email for pending registration", async () => {
		// Register but don't verify
		mockSendVerificationEmail.mockImplementationOnce(async () => {})
		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		)

		// Request resend
		const res = await app.fetch(
			new Request("http://localhost/auth/resend-verification", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: validRegistration.email }),
			}),
		)

		expect(res.status).toBe(200)
		expect(((await res.json()) as Record<string, unknown>).success).toBe(true)
		expect(mockSendVerificationEmail).toHaveBeenCalledTimes(2) // Once for register, once for resend
	})

	it("returns 200 even if email is already verified (prevents enumeration)", async () => {
		// Register and verify first
		let capturedToken = ""
		mockSendVerificationEmail.mockImplementationOnce(async (_to, token) => {
			capturedToken = token
		})
		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		)
		await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${capturedToken}`),
		)
		mockSendVerificationEmail.mockClear()

		// Try to resend
		const res = await app.fetch(
			new Request("http://localhost/auth/resend-verification", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: validRegistration.email }),
			}),
		)

		expect(res.status).toBe(200)
		expect(((await res.json()) as Record<string, unknown>).success).toBe(true)
		expect(mockSendVerificationEmail).not.toHaveBeenCalled() // No email sent for verified accounts
	})

	it("returns 200 even if email has no pending registration (prevents enumeration)", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/resend-verification", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "nonexistent@example.com" }),
			}),
		)

		expect(res.status).toBe(200)
		expect(((await res.json()) as Record<string, unknown>).success).toBe(true)
		expect(mockSendVerificationEmail).not.toHaveBeenCalled()
	})

	it("returns 400 for invalid email format", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/resend-verification", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "not-an-email" }),
			}),
		)

		expect(res.status).toBe(400)
	})
})
```

- [ ] **Step 4.4: Run updated tests**

```bash
cd apps/api && bun test src/modules/auth/auth.test.ts
```

Expected: All tests should pass.

- [ ] **Step 4.5: Commit the test additions**

```bash
git add apps/api/src/modules/auth/auth.test.ts
git commit -m "test(auth): add resend-verification endpoint tests"
```

---

## Task 5: Run Full Verification and Check Formatting

- [ ] **Step 5.1: Run Biome formatting check**

```bash
bun run check
```

Expected: No formatting errors. If there are any, fix them with:
```bash
bun run format
```

- [ ] **Step 5.2: Run full API tests**

```bash
cd apps/api && bun test
```

Expected: All tests should pass.

- [ ] **Step 5.3: Build the shared package**

```bash
cd packages/shared && bun run build
```

- [ ] **Step 5.4: Test the web app builds**

```bash
cd apps/web && bun run build
```

Expected: Build should succeed.

- [ ] **Step 5.5: Final commit if any formatting changes**

```bash
git add -A
git commit -m "style: fix formatting across auth files" || echo "No changes to commit"
```

---

## Summary Checklist

After completing all tasks:

- [ ] Resend email button shows on verify-email page error state
- [ ] Auto-redirect to dashboard after verification works correctly
- [ ] Success message correctly says "Redirecting to dashboard..."
- [ ] email.service.test.ts is restored
- [ ] auth.test.ts includes resend-verification tests
- [ ] All tests pass
- [ ] Biome formatting check passes
- [ ] Web app builds successfully
