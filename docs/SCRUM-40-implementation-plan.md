# SCRUM-40 Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the authentication flow (register, login, email verification) with proper guarded routes and all CodeRabbit fixes.

**Architecture:** Frontend uses TanStack Router with file-based routing, TanStack Query for data fetching, and openapi-fetch for API calls. Backend auth is already implemented with DrizzleAuthRepository using JWT tokens stored in localStorage.

**Tech Stack:** React, TypeScript, TanStack Router, TanStack Query, openapi-fetch, Tailwind CSS, shadcn/ui

---

## File Structure

**Files to Create:**
- `apps/web/src/routes/verify-email.tsx` - Email verification page
- `apps/web/src/routes/_authenticated.tsx` - Auth guard layout route

**Files to Modify:**
- `apps/web/src/api/hooks/useAuth.ts` - Add actual API mutations
- `apps/web/src/routes/login.tsx` - Wire up API, add loading states
- `apps/web/src/routes/register.tsx` - Wire up API, add loading states, add name field
- `apps/web/src/lib/constants.ts` - Add STORAGE_KEYS.TOKEN
- `apps/web/src/api/client.ts` - Ensure token middleware works correctly

**Files to Reference (already working on dev):**
- `apps/api/src/modules/auth/auth.routes.ts` - Backend API routes
- `apps/api/src/modules/auth/auth.service.ts` - Backend auth logic

---

## Prerequisites

Before starting, verify the backend is running and env vars are set:

- [ ] **Step 0.1: Start backend and check health**

```bash
cd apps/api && bun run dev &
curl http://localhost:3000/health || echo "Health endpoint not found - check if API is running"
```

**Check:** API should be running on localhost:3000

- [ ] **Step 0.2: Set environment variables**

Ensure `apps/web/.env.local` has:
```
VITE_API_URL=http://localhost:3000
```

---

## Task 1: Update Auth Constants

**Files:**
- Modify: `apps/web/src/lib/constants.ts`

- [ ] **Step 1.1: Add TOKEN storage key and AUTH constants**

```typescript
// Add to STORAGE_KEYS
export const STORAGE_KEYS = {
	// Theme
	THEME: "theme",

	// Chat messages
	CHAT_MESSAGES: "chatbot_messages",
	CHAT_RATING_SHOWN: "chatbot_rating_shown",
	CHAT_RATING_VALUE: "chatbot_rating_value",

	// Auth
	TOKEN: "token",
} as const;

// Add new AUTH constants block
export const AUTH = {
	TOKEN_KEY: "token",
	DEFAULT_REDIRECT: "/dashboard",
	LOGIN_ROUTE: "/login",
} as const;
```

- [ ] **Step 1.2: Commit**

```bash
git add apps/web/src/lib/constants.ts
git commit -m "feat(auth): add TOKEN storage key and AUTH constants"
```

---

## Task 2: Update useAuth Hook with API Mutations

**Files:**
- Modify: `apps/web/src/api/hooks/useAuth.ts`

- [ ] **Step 2.1: Read current useAuth.ts to understand structure**

Run: `cat apps/web/src/api/hooks/useAuth.ts`

- [ ] **Step 2.2: Replace useAuth.ts with complete implementation**

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "../client";
import { STORAGE_KEYS } from "@/lib/constants";

// Types from OpenAPI spec
interface LoginRequest {
	email: string;
	password: string;
}

interface RegisterRequest {
	name: string;
	email: string;
	password: string;
}

interface AuthResponse {
	success: boolean;
	data: {
		token?: string;
		message?: string;
	};
}

interface ApiError {
	success: false;
	error: {
		code: string;
		message: string;
	};
}

// Login mutation
export function useLogin() {
	const queryClient = useQueryClient();

	return useMutation<AuthResponse, ApiError, LoginRequest>({
		mutationFn: async (credentials) => {
			const { data, error } = await client.POST("/auth/login", {
				body: credentials,
			});
			if (error) throw error;
			return data as AuthResponse;
		},
		onSuccess: (data) => {
			if (data.data.token) {
				localStorage.setItem(STORAGE_KEYS.TOKEN, data.data.token);
				// Invalidate any existing auth queries
				queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
			}
		},
	});
}

// Register mutation
export function useRegister() {
	return useMutation<AuthResponse, ApiError, RegisterRequest>({
		mutationFn: async (data) => {
			const { data: responseData, error } = await client.POST("/auth/register", {
				body: data,
			});
			if (error) throw error;
			return responseData as AuthResponse;
		},
	});
}

// Verify email mutation
export function useVerifyEmail() {
	return useMutation<AuthResponse, ApiError, { token: string }>({
		mutationFn: async ({ token }) => {
			const { data, error } = await client.GET("/auth/verify-email", {
				params: {
					query: { token },
				},
			});
			if (error) throw error;
			return data as AuthResponse;
		},
	});
}

// Logout function (not a mutation, just clears storage)
export function useLogout() {
	const queryClient = useQueryClient();

	return () => {
		localStorage.removeItem(STORAGE_KEYS.TOKEN);
		queryClient.clear();
		window.location.href = "/login";
	};
}

// Get current user (optional - for future use with /client/me)
export function useCurrentUser() {
	return useQuery({
		queryKey: ["auth", "me"],
		queryFn: async () => {
			const { data, error } = await client.GET("/client/me");
			if (error) throw error;
			return data;
		},
		enabled: !!localStorage.getItem(STORAGE_KEYS.TOKEN),
	});
}
```

- [ ] **Step 2.3: Commit**

```bash
git add apps/web/src/api/hooks/useAuth.ts
git commit -m "feat(auth): implement useAuth hook with API mutations"
```

---

## Task 3: Create Authenticated Route Guard

**Files:**
- Create: `apps/web/src/routes/_authenticated.tsx`

- [ ] **Step 3.1: Create the authenticated layout route**

```typescript
import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { client } from "@/api/client";
import { STORAGE_KEYS, AUTH } from "@/lib/constants";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
	component: AuthenticatedLayout,
});

// Validate token by making a lightweight request
async function validateToken(token: string): Promise<boolean> {
	try {
		// We'll use the /client/me endpoint which requires auth
		const response = await fetch(
			`${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/client/me`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);
		return response.ok;
	} catch {
		return false;
	}
}

function AuthenticatedLayout() {
	const [isLoading, setIsLoading] = useState(true);
	const [isValid, setIsValid] = useState(false);

	useEffect(() => {
		const checkAuth = async () => {
			const token = localStorage.getItem(STORAGE_KEYS.TOKEN);

			if (!token) {
				setIsValid(false);
				setIsLoading(false);
				return;
			}

			const valid = await validateToken(token);
			if (!valid) {
				// Token is invalid, clear it
				localStorage.removeItem(STORAGE_KEYS.TOKEN);
			}
			setIsValid(valid);
			setIsLoading(false);
		};

		checkAuth();
	}, []);

	if (isLoading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	if (!isValid) {
		return <Navigate to={AUTH.LOGIN_ROUTE} replace />;
	}

	return <Outlet />;
}
```

- [ ] **Step 3.2: Commit**

```bash
git add apps/web/src/routes/_authenticated.tsx
git commit -m "feat(auth): add authenticated route guard"
```

---

## Task 4: Move Dashboard Routes Under Authenticated Guard

**Files:**
- Create: `apps/web/src/routes/_authenticated/dashboard.tsx` (move from existing)
- Create: `apps/web/src/routes/_authenticated/dashboard.index.tsx` (move from existing)
- Create: `apps/web/src/routes/_authenticated/dashboard.settings.tsx` (move from existing)
- Delete: `apps/web/src/routes/dashboard.tsx`
- Delete: `apps/web/src/routes/dashboard.index.tsx`
- Delete: `apps/web/src/routes/dashboard.settings.tsx`

- [ ] **Step 4.1: Create _authenticated directory and move dashboard files**

```bash
mkdir -p apps/web/src/routes/_authenticated
```

- [ ] **Step 4.2: Move dashboard.tsx to _authenticated/dashboard.tsx**

Copy content from `apps/web/src/routes/dashboard.tsx` to `apps/web/src/routes/_authenticated/dashboard.tsx`, import `Outlet` to render children:

```typescript
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: DashboardRoute,
});

function DashboardRoute() {
	return (
		<DashboardLayout>
			<Outlet />
		</DashboardLayout>
	);
}
```

- [ ] **Step 4.3: Move dashboard.index.tsx to _authenticated/dashboard.index.tsx**

```typescript
import { createFileRoute } from "@tanstack/react-router";
import {
	QuestionsAskedChart,
	TokenConsumptionChart,
} from "@/components/charts";
import { PageHeader } from "@/components/layout";
import { StatsGrid } from "@/components/stats";
import { ADMIN_STATS, WEEKLY_STATS_DATA } from "@/data/charts";

export const Route = createFileRoute("/_authenticated/dashboard/")({
	component: AdminDashboard,
});

function AdminDashboard() {
	return (
		<div className="space-y-6">
			<PageHeader
				title="Overview"
				subtitle="Monitor your bot's usage and token consumption."
			/>

			<StatsGrid stats={ADMIN_STATS} />

			<div className="grid gap-4 md:grid-cols-2">
				<TokenConsumptionChart data={WEEKLY_STATS_DATA} />
				<QuestionsAskedChart data={WEEKLY_STATS_DATA} />
			</div>
		</div>
	);
}
```

- [ ] **Step 4.4: Move dashboard.settings.tsx to _authenticated/dashboard.settings.tsx**

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { PageContainer } from "@/components/layout";
import { AccountSettingsTab, BillingSettingsTab } from "@/components/settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	return (
		<PageContainer>
			<div>
				<h1 className="font-bold text-2xl text-foreground tracking-tight">
					Settings
				</h1>
				<p className="text-muted-foreground">
					Manage your account settings and billing information.
				</p>
			</div>

			<Tabs defaultValue="account" className="w-full">
				<TabsList className="mb-4 flex-wrap gap-2">
					<TabsTrigger value="account">Account</TabsTrigger>
					<TabsTrigger value="billing">Usage & Billing</TabsTrigger>
				</TabsList>

				<TabsContent value="account">
					<AccountSettingsTab />
				</TabsContent>

				<TabsContent value="billing">
					<BillingSettingsTab />
				</TabsContent>
			</Tabs>
		</PageContainer>
	);
}
```

- [ ] **Step 4.5: Delete old dashboard route files**

```bash
rm apps/web/src/routes/dashboard.tsx
rm apps/web/src/routes/dashboard.index.tsx
rm apps/web/src/routes/dashboard.settings.tsx
```

- [ ] **Step 4.6: Regenerate route tree**

```bash
cd apps/web && bun run build  # This should regenerate the route tree
```

**Check:** Build should succeed and regenerate `routeTree.gen.ts`

- [ ] **Step 4.7: Commit**

```bash
git add apps/web/src/routes/_authenticated/ apps/web/src/routes/dashboard*.tsx apps/web/src/routeTree.gen.ts
git commit -m "refactor(routes): move dashboard routes under authenticated guard"
```

---

## Task 5: Create Verify Email Page

**Files:**
- Create: `apps/web/src/routes/verify-email.tsx`

- [ ] **Step 5.1: Create verify-email.tsx with React StrictMode protection**

```typescript
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useVerifyEmail } from "@/api/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/verify-email")({
	component: VerifyEmailPage,
	validateSearch: (search: Record<string, unknown>): { token?: string } => ({
		token: typeof search.token === "string" ? search.token : undefined,
	}),
});

type VerificationState =
	| { status: "loading" }
	| { status: "success" }
	| { status: "error"; code: string; message: string };

function VerifyEmailPage() {
	const { token } = Route.useSearch();
	const hasAttempted = useRef(false);
	const [state, setState] = useState<VerificationState>({ status: "loading" });
	const verifyEmail = useVerifyEmail();

	useEffect(() => {
		// Guard against React StrictMode double-mount
		if (hasAttempted.current) return;
		hasAttempted.current = true;

		if (!token) {
			setState({
				status: "error",
				code: "MISSING_TOKEN",
				message: "Verification token is missing. Please check your email link.",
			});
			return;
		}

		// Call verify endpoint
		verifyEmail.mutate(
			{ token },
			{
				onSuccess: () => {
					setState({ status: "success" });
				},
				onError: (error) => {
					const code = error.error?.code || "UNKNOWN_ERROR";
					let message = "Verification failed. Please try again.";

					if (code === "INVALID_TOKEN") {
						message = "The verification link is invalid. Please request a new one.";
					} else if (code === "TOKEN_EXPIRED") {
						message = "The verification link has expired. Please register again.";
					} else if (code === "EMAIL_ALREADY_VERIFIED") {
						message = "This email has already been verified. You can log in now.";
					}

					setState({ status: "error", code, message });
				},
			},
		);
	}, [token, verifyEmail]);

	if (state.status === "loading") {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<div className="mb-4 flex justify-center">
							<Loader2 className="h-12 w-12 animate-spin text-primary" />
						</div>
						<CardTitle className="text-2xl">Verifying your email...</CardTitle>
						<CardDescription>
							Please wait while we verify your email address.
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	if (state.status === "success") {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<div className="mb-4 flex justify-center">
							<CheckCircle2 className="h-12 w-12 text-green-500" />
						</div>
						<CardTitle className="text-2xl">Email verified!</CardTitle>
						<CardDescription>
							Your email has been verified successfully. You can now log in to your account.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button asChild className="w-full">
							<Link to="/login">Go to login</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Error state
	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="mb-4 flex justify-center">
						<AlertCircle className="h-12 w-12 text-destructive" />
					</div>
					<CardTitle className="text-2xl">Verification failed</CardTitle>
					<CardDescription>
						We couldn't verify your email.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<Alert variant="destructive">
						<AlertDescription>{state.message}</AlertDescription>
					</Alert>
					<div className="flex flex-col gap-2">
						<Button asChild variant="outline" className="w-full">
							<Link to="/register">Register again</Link>
						</Button>
						<Button asChild variant="ghost" className="w-full">
							<Link to="/login">Go to login</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
```

- [ ] **Step 5.2: Commit**

```bash
git add apps/web/src/routes/verify-email.tsx
git commit -m "feat(auth): add email verification page with StrictMode protection"
```

---

## Task 6: Update Register Page with API Integration

**Files:**
- Modify: `apps/web/src/routes/register.tsx`
- Read: `apps/web/src/schemas/index.ts` (to understand registerSchema)

- [ ] **Step 6.1: Read current register.tsx and schemas**

Run:
```bash
cat apps/web/src/routes/register.tsx
cat apps/web/src/schemas/index.ts | head -50
```

- [ ] **Step 6.2: Update register.tsx with API integration and name field**

The register page needs:
1. Add `name` field to form
2. Wire up `useRegister` mutation
3. Show loading state during submit
4. Handle errors from API
5. Show success message with email sent confirmation
6. Redirect to login after successful registration

```typescript
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthFormField, AuthHeader } from "@/components/auth";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "@/lib/useForm";
import { registerSchema } from "@/schemas";
import { useRegister } from "@/api/hooks/useAuth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/register")({
	component: RegisterPage,
});

interface RegisterFormData extends Record<string, string> {
	name: string;
	email: string;
	password: string;
	confirmPassword: string;
}

function validateRegisterForm(values: RegisterFormData) {
	const result = registerSchema.safeParse(values);
	if (result.success) return {};

	const errors: Partial<Record<keyof RegisterFormData, string>> = {};
	for (const issue of result.error.issues) {
		const path = issue.path[0] as keyof RegisterFormData;
		if (!errors[path]) {
			errors[path] = issue.message;
		}
	}
	return errors;
}

function RegisterPage() {
	const navigate = useNavigate();
	const register = useRegister();
	const [showSuccess, setShowSuccess] = useState(false);

	const { values, errors, touched, handleChange, handleBlur, handleSubmit } =
		useForm<RegisterFormData>({
			initialValues: { name: "", email: "", password: "", confirmPassword: "" },
			validate: validateRegisterForm,
			onSubmit: async () => {
				register.mutate(
					{
						name: values.name,
						email: values.email,
						password: values.password,
					},
					{
						onSuccess: () => {
							setShowSuccess(true);
						},
						// Error handling is done via register.error
					},
				);
			},
		});

	// Success state - show confirmation
	if (showSuccess) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
				<div className="w-full max-w-sm">
					<AuthHeader />
					<Card>
						<CardHeader className="space-y-1">
							<CardTitle className="text-center text-2xl">Check your email!</CardTitle>
							<CardDescription className="text-center">
								We've sent a verification link to {values.email}. Click it to
								activate your account.
							</CardDescription>
						</CardHeader>
						<CardFooter className="flex flex-col">
							<Button asChild className="w-full">
								<Link to="/login">Go to login</Link>
							</Button>
						</CardFooter>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
			<div className="w-full max-w-sm">
				<AuthHeader />

				<Card>
					<CardHeader className="space-y-1">
						<CardTitle className="text-center text-2xl">
							Create an account
						</CardTitle>
						<CardDescription className="text-center">
							Enter your details below to create your account
						</CardDescription>
					</CardHeader>
					<form onSubmit={handleSubmit} noValidate>
						<CardContent className="space-y-4">
							{register.error && (
								<Alert variant="destructive">
									<AlertDescription>
										{register.error.error?.message || "Registration failed. Please try again."}
									</AlertDescription>
								</Alert>
							)}
							<AuthFormField
								id="name"
								name="name"
								label="Name"
								type="text"
								placeholder="John Doe"
								value={values.name}
								onChange={handleChange("name")}
								onBlur={handleBlur("name")}
								error={errors.name}
								showError={touched.name && !!errors.name}
								errorId="name-error"
								autoComplete="name"
							/>
							<AuthFormField
								id="email"
								name="email"
								label="Email"
								type="email"
								placeholder="m@example.com"
								value={values.email}
								onChange={handleChange("email")}
								onBlur={handleBlur("email")}
								error={errors.email}
								showError={touched.email && !!errors.email}
								errorId="email-error"
								autoComplete="email"
							/>
							<AuthFormField
								id="password"
								name="password"
								label="Password"
								type="password"
								value={values.password}
								onChange={handleChange("password")}
								onBlur={handleBlur("password")}
								error={errors.password}
								showError={touched.password && !!errors.password}
								errorId="password-error"
								autoComplete="new-password"
							/>
							<AuthFormField
								id="confirm-password"
								name="confirmPassword"
								label="Confirm Password"
								type="password"
								value={values.confirmPassword}
								onChange={handleChange("confirmPassword")}
								onBlur={handleBlur("confirmPassword")}
								error={errors.confirmPassword}
								showError={touched.confirmPassword && !!errors.confirmPassword}
								errorId="confirm-password-error"
								autoComplete="new-password"
							/>
						</CardContent>
						<CardFooter className="flex flex-col">
							<Button
								className="w-full"
								type="submit"
								disabled={register.isPending}
							>
								{register.isPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Creating account...
									</>
								) : (
									"Create account"
								)}
							</Button>
							<div className="mt-4 text-center text-muted-foreground text-sm">
								Already have an account?{" "}
								<Link
									to="/login"
									className="rounded-md border border-primary/50 px-3 py-1 font-medium text-primary underline underline-offset-4 hover:border-primary hover:text-primary/80"
								>
									Log in
								</Link>
							</div>
						</CardFooter>
					</form>
				</Card>
			</div>
		</div>
	);
}
```

- [ ] **Step 6.3: Update registerSchema to include name field**

Check if `registerSchema` includes name validation. If not, update `apps/web/src/schemas/index.ts`:

```typescript
export const registerSchema = z
	.object({
		name: z.string().min(2, "Name must be at least 2 characters"),
		email: z.string().email("Please enter a valid email address"),
		password: z.string().min(8, "Password must be at least 8 characters"),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});
```

- [ ] **Step 6.4: Commit**

```bash
git add apps/web/src/routes/register.tsx apps/web/src/schemas/index.ts
git commit -m "feat(auth): wire up register page to API with name field"
```

---

## Task 7: Update Login Page with API Integration

**Files:**
- Modify: `apps/web/src/routes/login.tsx`

- [ ] **Step 7.1: Read current login.tsx**

Run: `cat apps/web/src/routes/login.tsx`

- [ ] **Step 7.2: Update login.tsx with API integration**

```typescript
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthFormField, AuthHeader } from "@/components/auth";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "@/lib/useForm";
import { loginSchema } from "@/schemas";
import { useLogin } from "@/api/hooks/useAuth";
import { AUTH } from "@/lib/constants";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});

interface LoginFormData extends Record<string, string> {
	email: string;
	password: string;
}

const validateLoginForm = (values: LoginFormData) => {
	const result = loginSchema.safeParse(values);
	if (result.success) return {};

	const errors: Partial<Record<keyof LoginFormData, string>> = {};
	for (const issue of result.error.issues) {
		const path = issue.path[0] as keyof LoginFormData;
		errors[path] = issue.message;
	}
	return errors;
};

function LoginPage() {
	const navigate = useNavigate();
	const login = useLogin();

	const { values, errors, touched, handleChange, handleBlur, handleSubmit } =
		useForm<LoginFormData>({
			initialValues: { email: "", password: "" },
			validate: validateLoginForm,
			onSubmit: async () => {
				login.mutate(
					{ email: values.email, password: values.password },
					{
						onSuccess: () => {
							// Token is stored by the mutation's onSuccess
							navigate({ to: AUTH.DEFAULT_REDIRECT });
						},
						// Error handling via login.error
					},
				);
			},
		});

	// Determine error message
	let errorMessage: string | null = null;
	if (login.error) {
		if (login.error.error?.code === "INVALID_CREDENTIALS") {
			errorMessage = "Invalid email or password. Please try again.";
		} else {
			errorMessage = login.error.error?.message || "Login failed. Please try again.";
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
			<div className="w-full max-w-sm">
				<AuthHeader />

				<Card>
					<CardHeader className="space-y-1">
						<CardTitle className="text-center text-2xl">Log in</CardTitle>
						<CardDescription className="text-center">
							Enter your email and password to access your dashboard
						</CardDescription>
					</CardHeader>
					<form onSubmit={handleSubmit} noValidate>
						<CardContent className="space-y-4">
							{errorMessage && (
								<Alert variant="destructive">
									<AlertDescription>{errorMessage}</AlertDescription>
								</Alert>
							)}
							<AuthFormField
								id="email"
								name="email"
								label="Email"
								type="email"
								placeholder="m@example.com"
								value={values.email}
								onChange={handleChange("email")}
								onBlur={handleBlur("email")}
								error={errors.email}
								showError={touched.email && !!errors.email}
								errorId="email-error"
								autoComplete="email"
							/>
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<label
										htmlFor="password"
										className="font-medium text-sm leading-none"
									>
										Password
									</label>
									<button
										type="button"
										className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
									>
										Forgot password?
									</button>
								</div>
								<AuthFormField
									id="password"
									name="password"
									label=""
									type="password"
									value={values.password}
									onChange={handleChange("password")}
									onBlur={handleBlur("password")}
									error={errors.password}
									showError={touched.password && !!errors.password}
									errorId="password-error"
									autoComplete="current-password"
								/>
							</div>
						</CardContent>
						<CardFooter className="flex flex-col">
							<Button
								className="w-full"
								type="submit"
								disabled={login.isPending}
							>
								{login.isPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Logging in...
									</>
								) : (
									"Log in"
								)}
							</Button>
							<div className="mt-4 text-center text-muted-foreground text-sm">
								Don&apos;t have an account?{" "}
								<Link
									to="/register"
									className="rounded-md border border-primary/50 px-3 py-1 font-medium text-primary underline underline-offset-4 hover:border-primary hover:text-primary/80"
								>
									Sign up
								</Link>
							</div>
						</CardFooter>
					</form>
				</Card>
			</div>
		</div>
	);
}
```

- [ ] **Step 7.3: Commit**

```bash
git add apps/web/src/routes/login.tsx
git commit -m "feat(auth): wire up login page to API with loading states"
```

---

## Task 8: Fix DashboardLayout Logout

**Files:**
- Modify: `apps/web/src/components/layout/DashboardLayout.tsx`

- [ ] **Step 8.1: Read current DashboardLayout.tsx**

Run: `cat apps/web/src/components/layout/DashboardLayout.tsx`

- [ ] **Step 8.2: Add logout functionality to DashboardLayout**

```typescript
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/api/hooks/useAuth";
import { LogOut } from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
	const logout = useLogout();

	return (
		<div className="min-h-screen bg-background">
			<header className="border-b">
				<div className="flex h-16 items-center px-4 md:px-6">
					<Link to="/dashboard" className="font-bold text-xl">
						Chatbot Admin
					</Link>
					<nav className="ml-auto flex items-center gap-4">
						<Link to="/dashboard">Overview</Link>
						<Link to="/dashboard/settings">Settings</Link>
						<Button variant="ghost" size="sm" onClick={logout}>
							<LogOut className="mr-2 h-4 w-4" />
							Logout
						</Button>
					</nav>
				</div>
			</header>
			<main className="p-4 md:p-6">{children}</main>
		</div>
	);
}
```

- [ ] **Step 8.3: Commit**

```bash
git add apps/web/src/components/layout/DashboardLayout.tsx
git commit -m "feat(auth): add logout button to dashboard layout"
```

---

## Task 9: Move Remaining Dashboard Routes

**Files:**
- Move: `apps/web/src/routes/dashboard.bot-config.tsx` → `apps/web/src/routes/_authenticated/dashboard.bot-config.tsx`
- Move: `apps/web/src/routes/dashboard.bot-context.tsx` → `apps/web/src/routes/_authenticated/dashboard.bot-context.tsx`
- Move: `apps/web/src/routes/dashboard.tools.tsx` → `apps/web/src/routes/_authenticated/dashboard.tools.tsx`

- [ ] **Step 9.1: Move the remaining dashboard route files**

```bash
cp apps/web/src/routes/dashboard.bot-config.tsx apps/web/src/routes/_authenticated/dashboard.bot-config.tsx
cp apps/web/src/routes/dashboard.bot-context.tsx apps/web/src/routes/_authenticated/dashboard.bot-context.tsx
cp apps/web/src/routes/dashboard.tools.tsx apps/web/src/routes/_authenticated/dashboard.tools.tsx

rm apps/web/src/routes/dashboard.bot-config.tsx
rm apps/web/src/routes/dashboard.bot-context.tsx
rm apps/web/src/routes/dashboard.tools.tsx
```

- [ ] **Step 9.2: Update import paths in copied files**

Each file needs its route path updated from `/dashboard/...` to `/_authenticated/dashboard/...`.

For example, in `dashboard.bot-config.tsx`:
```typescript
export const Route = createFileRoute("/_authenticated/dashboard/bot-config")({
	component: BotConfigPage,
});
```

- [ ] **Step 9.3: Regenerate route tree**

```bash
cd apps/web && bun run build
```

**Check:** Build succeeds

- [ ] **Step 9.4: Commit**

```bash
git add apps/web/src/routes/_authenticated/ apps/web/src/routes/dashboard.*.tsx apps/web/src/routeTree.gen.ts
git commit -m "refactor(routes): move all dashboard routes under authenticated guard"
```

---

## Task 10: Add Missing Alert Component (if needed)

**Files:**
- Check: `apps/web/src/components/ui/alert.tsx`

- [ ] **Step 10.1: Check if Alert component exists**

Run: `ls apps/web/src/components/ui/alert.tsx`

- [ ] **Step 10.2: If missing, install via shadcn**

```bash
cd apps/web && bunx shadcn@latest add alert
```

- [ ] **Step 10.3: Commit if added**

```bash
git add apps/web/src/components/ui/alert.tsx
git commit -m "chore(deps): add alert component from shadcn"
```

---

## Task 11: Manual Testing

- [ ] **Step 11.1: Test full registration flow**

1. Navigate to `/register`
2. Fill in name, email, password
3. Submit -> Should show "Check your email!" message
4. Check email (or database for token)
5. Click verification link -> Should show success screen
6. Try clicking link again -> Should show "already verified" message

- [ ] **Step 11.2: Test login flow**

1. Navigate to `/login`
2. Enter wrong password -> Should show generic error
3. Enter correct credentials -> Should redirect to `/dashboard`
4. Check localStorage has token
5. Close tab, reopen `/dashboard` -> Should still be logged in

- [ ] **Step 11.3: Test authenticated route guard**

1. Clear localStorage token
2. Navigate to `/dashboard` -> Should redirect to `/login`
3. Visit `/dashboard/settings` directly -> Should redirect to `/login`
4. Login, then try `/dashboard` -> Should work

- [ ] **Step 11.4: Test logout**

1. Login
2. Click logout
3. Should clear token and redirect to login
4. Try accessing `/dashboard` -> Should redirect to login

---

## Task 12: Run Biome Check

- [ ] **Step 12.1: Run linter/formatter**

```bash
bun run check
```

**Check:** All checks pass

- [ ] **Step 12.2: Fix any issues**

```bash
bun run check:fix
```

- [ ] **Step 12.3: Commit fixes**

```bash
git add -A && git commit -m "style: apply biome formatting fixes"
```

---

## Summary of Changes

This implementation plan:

1. **Uses existing backend auth** - No backend changes needed (dev branch already has DrizzleAuthRepository)
2. **Integrates frontend with API** - Wires up login/register pages to real endpoints
3. **Adds email verification** - Creates `/verify-email` route with StrictMode protection
4. **Implements auth guards** - Moves all dashboard routes under `_authenticated.tsx` layout
5. **Handles loading states** - Shows spinners during API calls
6. **Handles errors** - User-friendly error messages
7. **Adds logout** - Clears token and redirects

**Key CodeRabbit fixes included:**
- React StrictMode double-mount protection in verify-email
- Proper error handling without exposing internal errors
- Loading states on all async operations
- Generic error messages for security (e.g., "Invalid email or password" instead of "User not found")
- Atomic operations handled by backend transaction
