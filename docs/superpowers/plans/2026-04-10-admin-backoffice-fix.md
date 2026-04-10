# Admin Backoffice Access Fix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans

**Goal:** Fix admin backoffice access - add `/admin/me` endpoint, create admin auth hook, fix redirects

**Architecture:**
- Backend: Add `/admin/me` endpoint to admin routes
- Frontend: Create `useCurrentAdmin` hook, update backoffice to use it
- Configure proper redirects for admin users

---

## Task 1: Add `/admin/me` API Endpoint

**Files:**
- Modify: `apps/api/src/modules/admin/admin.routes.ts`

### Steps:

- [ ] **Step 1: Add /admin/me route to adminAuthRouter**

Add a new route in `createAdminAuthRouter` function (before the return statement):

```typescript
router.openapi(
	createRoute({
		method: "get",
		path: "/me",
		tags: ["Admin"],
		summary: "Get current admin profile",
		security: [{ bearerAuth: [] }],
		responses: {
			200: {
				description: "Admin profile",
				content: {
					"application/json": {
						schema: successResponseSchema(
							z.object({
								id: z.string(),
								email: z.string(),
								role: z.literal("admin"),
							}),
						),
					},
				},
			},
			401: {
				description: "Unauthorized",
				content: { "application/json": { schema: errorResponseSchema } },
			},
		},
	}),
	async (c) => {
		const adminId = c.get("adminId" as never) as string
		const admin = await service.getAdminById(adminId)
		if (!admin) {
			return c.json(
				{ success: false as const, error: { code: "NOT_FOUND", message: "Admin not found" } },
				404,
			)
		}
		return c.json(
			{ success: true as const, data: { id: admin.id, email: admin.email, role: "admin" as const } },
			200,
		)
	},
)
```

- [ ] **Step 2: Add getAdminById to AdminService**

In `apps/api/src/modules/admin/admin.service.ts`:

```typescript
async getAdminById(adminId: string) {
	return this.repo.getAdminById(adminId)
}
```

- [ ] **Step 3: Add getAdminById to AdminRepository interface and implementation**

In repository - add method:

```typescript
async getAdminById(adminId: string) {
	const result = await this.db.query.admins.findFirst({
		where: eq(admins.id, adminId),
		columns: { id: true, email: true },
	})
	return result
}
```

- [ ] **Step 4: Mount the route in app.ts**

Update `apps/api/src/app.ts` to mount `/admin/me`:

```typescript
// Add after admin auth routes
app.use("/admin/me", adminAuth)
app.route("/admin/me", adminAuthRoutes) // Needs different approach - might need separate router
```

Actually - better: add this route to the existing `adminAuthRoutes` but use `adminAuth` middleware instead of being unprotected.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/admin/
git commit -m "feat(api): add /admin/me endpoint for admin profile"
```

---

## Task 2: Fix Admin Redirect Constant

**Files:**
- Modify: `apps/web/src/lib/constants.ts`

### Steps:

- [ ] **Step 1: Update ADMIN_DEFAULT_REDIRECT**

Change from `/dashboard` to `/backoffice`:

```typescript
export const AUTH = {
	TOKEN_KEY: "token",
	ADMIN_TOKEN_KEY: "admin_token",
	DEFAULT_REDIRECT: "/dashboard",
	ADMIN_DEFAULT_REDIRECT: "/backoffice",  // Changed from /dashboard
	LOGIN_ROUTE: "/login",
} as const
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/constants.ts
git commit -m "fix(web): redirect admins to /backoffice after login"
```

---

## Task 3: Create useCurrentAdmin Hook

**Files:**
- Modify: `apps/web/src/api/hooks/useAuth.ts`

### Steps:

- [ ] **Step 1: Add useCurrentAdmin function**

After `useCurrentUser`, add:

```typescript
// Get current admin (for admin dashboard)
export function useCurrentAdmin() {
	return useQuery({
		queryKey: ["admin", "me"],
		queryFn: async () => {
			const { data, error } = await client.GET("/admin/me")
			if (error) throw error
			return data
		},
		enabled: !!localStorage.getItem(AUTH.ADMIN_TOKEN_KEY),
	})
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/api/hooks/useAuth.ts
git commit -m "feat(web): add useCurrentAdmin hook"
```

---

## Task 4: Fix Backoffice Auth

**Files:**
- Modify: `apps/web/src/routes/backoffice.tsx`

### Steps:

- [ ] **Step 1: Update imports and hook**

```typescript
import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router"
import { useCurrentAdmin } from "@/api/hooks/useAuth"
import { DashboardLayout } from "@/components/layout"

export const Route = createFileRoute("/backoffice")({
	component: BackofficeLayout,
})

function BackofficeLayout() {
	const { data: admin, isLoading } = useCurrentAdmin()

	if (isLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		)
	}

	// Redirect to login if not authenticated as admin
	if (!admin) {
		return <Navigate to="/login" />
	}

	return (
		<DashboardLayout>
			<Outlet />
		</DashboardLayout>
	)
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/routes/backoffice.tsx
git commit -m "fix(web): use admin auth for backoffice route"
```

---

## Task 5: Add Protected Layout for Backoffice

**Files:**
- Create: `apps/web/src/routes/_backoffice.tsx`

### Steps:

- [ ] **Step 1: Create _backoffice layout route**

Similar to `_authenticated.tsx` but for admins:

```typescript
import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { AUTH, STORAGE_KEYS } from "@/lib/constants"

export const Route = createFileRoute("/_backoffice")({
	component: BackofficeProtectedLayout,
})

async function validateAdminToken(
	token: string,
): Promise<{ valid: boolean; shouldClear: boolean }> {
	try {
		const response = await fetch(
			`${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/admin/me`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		)

		if (response.ok) {
			return { valid: true, shouldClear: false }
		}

		const shouldClear = response.status === 401 || response.status === 403
		return { valid: false, shouldClear }
	} catch {
		return { valid: false, shouldClear: false }
	}
}

function BackofficeProtectedLayout() {
	const [isLoading, setIsLoading] = useState(true)
	const [isValid, setIsValid] = useState(false)

	useEffect(() => {
		const checkAuth = async () => {
			const token = localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN)

			if (!token) {
				setIsValid(false)
				setIsLoading(false)
				return
			}

			const { valid, shouldClear } = await validateAdminToken(token)
			if (shouldClear) {
				localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN)
			}
			setIsValid(valid)
			setIsLoading(false)
		}

		checkAuth()
	}, [])

	if (isLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		)
	}

	if (!isValid) {
		return <Navigate to={AUTH.LOGIN_ROUTE} replace />
	}

	return <Outlet />
}
```

- [ ] **Step 2: Update STORAGE_KEYS for admin token**

In `apps/web/src/lib/constants.ts`:

```typescript
export const STORAGE_KEYS = {
	// Theme
	THEME: "theme",

	// Chat messages
	CHAT_MESSAGES: "chatbot_messages",
	CHAT_RATING_SHOWN: "chatbot_rating_shown",
	CHAT_RATING_VALUE: "chatbot_rating_value",

	// Auth
	TOKEN: "token",
	ADMIN_TOKEN: "admin_token",  // Add this
} as const
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/_backoffice.tsx apps/web/src/lib/constants.ts
git commit -m "feat(web): add protected layout for backoffice routes"
```

---

---

## Task 6: Update Email Service Tests

**Files:**
- Modify: `apps/api/src/common/email/email.service.test.ts`

### Steps:

- [ ] **Step 1: Replace entire test file content**

Replace the content of `apps/api/src/common/email/email.service.test.ts` with:

```typescript
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

type SendPayload = { from: string; to: string; subject: string; html: string };
type SendResult = {
    data: { id: string } | null;
    error: { message: string; name: string } | null;
};

const mockSend = mock(
    async (_payload: SendPayload): Promise<SendResult> => ({
        data: { id: "test-id" },
        error: null,
    }),
);

mock.module("resend", () => ({
    Resend: class {
        emails = { send: mockSend };
    },
}));

const { sendPasswordResetEmail, sendQuotaAlertEmail, sendVerificationEmail } =
    await import("./email.service");

describe("email.service", () => {
    beforeEach(() => {
        process.env.RESEND_API_KEY = "test-api-key";
        process.env.APP_URL = "http://localhost:5173";
    });

    afterEach(() => {
        delete process.env.RESEND_API_KEY;
        delete process.env.APP_URL;
        mockSend.mockClear();
    });

    describe("sendVerificationEmail", () => {
        it("resolves without throwing", async () => {
            await expect(
                sendVerificationEmail("user@example.com", "token-abc"),
            ).resolves.toBeUndefined();
        });

        it("calls resend with correct to address", async () => {
            await sendVerificationEmail("user@example.com", "token-abc");
            expect(mockSend).toHaveBeenCalledTimes(1);
            expect(
                (mockSend.mock.calls[0] as unknown as [SendPayload])[0],
            ).toMatchObject({ to: "user@example.com" });
        });

        it("includes the token in the email body", async () => {
            await sendVerificationEmail("user@example.com", "token-abc");
            const { html } = (mockSend.mock.calls[0] as unknown as [SendPayload])[0];
            expect(html).toContain("token-abc");
        });

        it("throws when RESEND_API_KEY is not set", async () => {
            delete process.env.RESEND_API_KEY;
            await expect(
                sendVerificationEmail("user@example.com", "token-abc"),
            ).rejects.toThrow("RESEND_API_KEY environment variable is not set");
        });

        it("throws when resend returns an error", async () => {
            mockSend.mockImplementationOnce(async () => ({
                data: null,
                error: { message: "invalid api key", name: "validation_error" },
            }));
            await expect(
                sendVerificationEmail("user@example.com", "token-abc"),
            ).rejects.toThrow("Failed to send email to user@example.com");
        });
    });

    describe("sendPasswordResetEmail", () => {
        it("resolves without throwing", async () => {
            await expect(
                sendPasswordResetEmail("user@example.com", "reset-token"),
            ).resolves.toBeUndefined();
        });

        it("calls resend with correct to address", async () => {
            await sendPasswordResetEmail("user@example.com", "reset-token");
            expect(mockSend).toHaveBeenCalledTimes(1);
            expect(
                (mockSend.mock.calls[0] as unknown as [SendPayload])[0],
            ).toMatchObject({ to: "user@example.com" });
        });

        it("includes the token in the email body", async () => {
            await sendPasswordResetEmail("user@example.com", "reset-token");
            const { html } = (mockSend.mock.calls[0] as unknown as [SendPayload])[0];
            expect(html).toContain("reset-token");
        });

        it("throws when resend returns an error", async () => {
            mockSend.mockImplementationOnce(async () => ({
                data: null,
                error: { message: "rate limit exceeded", name: "rate_limit_exceeded" },
            }));
            await expect(
                sendPasswordResetEmail("user@example.com", "reset-token"),
            ).rejects.toThrow("Failed to send email to user@example.com");
        });
    });

    describe("sendQuotaAlertEmail", () => {
        it("resolves without throwing", async () => {
            await expect(
                sendQuotaAlertEmail("user@example.com", 80),
            ).resolves.toBeUndefined();
        });

        it("calls resend with correct to address", async () => {
            await sendQuotaAlertEmail("user@example.com", 80);
            expect(mockSend).toHaveBeenCalledTimes(1);
            expect(
                (mockSend.mock.calls[0] as unknown as [SendPayload])[0],
            ).toMatchObject({ to: "user@example.com" });
        });

        it("includes the usage percentage in the email body", async () => {
            await sendQuotaAlertEmail("user@example.com", 80);
            const { html } = (mockSend.mock.calls[0] as unknown as [SendPayload])[0];
            expect(html).toContain("80");
        });

        it("throws when resend returns an error", async () => {
            mockSend.mockImplementationOnce(async () => ({
                data: null,
                error: {
                    message: "service unavailable",
                    name: "internal_server_error",
                },
            }));
            await expect(sendQuotaAlertEmail("user@example.com", 80)).rejects.toThrow(
                "Failed to send email to user@example.com",
            );
        });
    });
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/common/email/email.service.test.ts
git commit -m "test(api): update email service tests with proper mocking"
```

---

## Verification Checklist

- [ ] Admin can log in via `/login`
- [ ] Admin is redirected to `/backoffice` after login
- [ ] `/backoffice` loads without "Something went wrong" error
- [ ] Client user logging in goes to `/dashboard`
- [ ] Admin token is validated via `/admin/me`
- [ ] Unauthenticated users are redirected to `/login`
