# Password Reset Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor password reset functionality: infer `PasswordResetToken` type from Drizzle schema and decompose `forgot-password.tsx` and `reset-password.tsx` route files into smaller state-specific components.

**Architecture:** Follow the existing auth component pattern (like `AuthHeader`, `AuthFormField`). Extract UI states into focused components while keeping state logic in route files. Use Drizzle's `$inferSelect` for type inference to maintain single source of truth.

**Tech Stack:** React, TypeScript, TanStack Router, shadcn/ui, Drizzle ORM

---

## File Structure

**Modified files:**
- `apps/api/src/modules/auth/auth.repository.ts` - Replace manual `PasswordResetToken` type with inferred type
- `apps/web/src/routes/forgot-password.tsx` - Decompose into smaller components
- `apps/web/src/routes/reset-password.tsx` - Decompose into smaller components

**New files:**
- `apps/web/src/components/auth/ForgotPasswordForm.tsx` - Email input form component
- `apps/web/src/components/auth/ForgotPasswordSuccess.tsx` - Success confirmation component
- `apps/web/src/components/auth/ResetPasswordVerifying.tsx` - Loading state component
- `apps/web/src/components/auth/ResetPasswordInvalid.tsx` - Invalid token state component
- `apps/web/src/components/auth/ResetPasswordForm.tsx` - New password form component
- `apps/web/src/components/auth/ResetPasswordSuccess.tsx` - Success state component
- `apps/web/src/components/auth/PasswordInput.tsx` - Reusable password input with show/hide toggle
- `apps/web/src/components/auth/AuthCard.tsx` - Reusable centered auth card layout

---

## Task 1: Infer PasswordResetToken from Drizzle Schema

**Files:**
- Modify: `apps/api/src/modules/auth/auth.repository.ts:33-40`

**Context:** The `PasswordResetToken` type is currently manually defined. It should be inferred from the Drizzle schema to maintain a single source of truth.

- [ ] **Step 1: Update the type definition**

Replace lines 33-40 in `auth.repository.ts`:

```typescript
// Before (lines 33-40):
// Transient storage for password reset requests.
// Tokens are single-use and expire after 1 hour.
export type PasswordResetToken = {
    token: string
    email: string
    expiresAt: Date
    consumedAt?: Date | null
}
```

```typescript
// After:
// Inferred from Drizzle schema - single source of truth
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect
```

- [ ] **Step 2: Verify the import exists**

Ensure `passwordResetTokens` is imported at the top of the file (check line 5):

```typescript
import {
    clients,
    passwordResetTokens,
    pendingRegistrations,
} from "../../db/schema"
```

- [ ] **Step 3: Run type check to verify**

Run: `cd apps/api && bun run typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/auth/auth.repository.ts
git commit -m "refactor(auth): infer PasswordResetToken from Drizzle schema"
```

---

## Task 2: Create AuthCard Component

**Files:**
- Create: `apps/web/src/components/auth/AuthCard.tsx`
- Modify: `apps/web/src/components/auth/index.ts`

**Context:** A reusable card wrapper for auth pages that handles the common layout (centered, max-width, background).

- [ ] **Step 1: Create AuthCard.tsx**

Create file `apps/web/src/components/auth/AuthCard.tsx`:

```typescript
import type { ReactNode } from "react"

interface AuthCardProps {
	children: ReactNode
	className?: string
}

export function AuthCard({ children, className }: AuthCardProps) {
	return (
		<div
			className={`flex min-h-screen items-center justify-center bg-background px-4 py-12 ${className ?? ""}`}
		>
			{children}
		</div>
	)
}
```

- [ ] **Step 2: Export from index.ts**

Add to `apps/web/src/components/auth/index.ts`:

```typescript
export { AuthCard } from "./AuthCard"
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/auth/AuthCard.tsx apps/web/src/components/auth/index.ts
git commit -m "feat(auth): add AuthCard component for consistent auth layouts"
```

---

## Task 3: Create PasswordInput Component

**Files:**
- Create: `apps/web/src/components/auth/PasswordInput.tsx`
- Modify: `apps/web/src/components/auth/index.ts`

**Context:** A reusable password input with the show/hide toggle button, following the pattern in reset-password.tsx.

- [ ] **Step 1: Create PasswordInput.tsx**

Create file `apps/web/src/components/auth/PasswordInput.tsx`:

```typescript
import { useState } from "react"
import { Eye, EyeOff, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface PasswordInputProps {
	id: string
	label: string
	value: string
	onChange: (value: string) => void
	placeholder?: string
	autoComplete?: string
	disabled?: boolean
	helpText?: string
}

export function PasswordInput({
	id,
	label,
	value,
	onChange,
	placeholder = "Enter password",
	autoComplete = "new-password",
	disabled = false,
	helpText,
}: PasswordInputProps) {
	const [showPassword, setShowPassword] = useState(false)

	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<div className="relative">
				<Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					id={id}
					type={showPassword ? "text" : "password"}
					placeholder={placeholder}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className="pr-10 pl-10"
					autoComplete={autoComplete}
					disabled={disabled}
				/>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
					onClick={() => setShowPassword(!showPassword)}
					aria-label={showPassword ? "Hide password" : "Show password"}
					aria-pressed={showPassword}
					disabled={disabled}
				>
					{showPassword ? (
						<EyeOff className="h-4 w-4" />
					) : (
						<Eye className="h-4 w-4" />
					)}
				</Button>
			</div>
			{helpText && (
				<p className="text-muted-foreground text-xs">{helpText}</p>
			)}
		</div>
	)
}
```

- [ ] **Step 2: Export from index.ts**

Add to `apps/web/src/components/auth/index.ts`:

```typescript
export { PasswordInput } from "./PasswordInput"
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/auth/PasswordInput.tsx apps/web/src/components/auth/index.ts
git commit -m "feat(auth): add PasswordInput component with show/hide toggle"
```

---

## Task 4: Create ForgotPasswordForm Component

**Files:**
- Create: `apps/web/src/components/auth/ForgotPasswordForm.tsx`
- Modify: `apps/web/src/components/auth/index.ts`

**Context:** The email input form for the forgot password flow (initial state).

- [ ] **Step 1: Create ForgotPasswordForm.tsx**

Create file `apps/web/src/components/auth/ForgotPasswordForm.tsx`:

```typescript
import { ArrowLeft, Loader2, Mail } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ForgotPasswordFormProps {
	email: string
	onEmailChange: (email: string) => void
	onSubmit: (e: React.FormEvent) => void
	isPending: boolean
	error: Error | null
}

export function ForgotPasswordForm({
	email,
	onEmailChange,
	onSubmit,
	isPending,
	error,
}: ForgotPasswordFormProps) {
	return (
		<Card>
			<CardHeader className="space-y-1">
				<CardTitle className="text-center text-2xl">Forgot password?</CardTitle>
				<CardDescription className="text-center">
					Enter your email address and we&apos;ll send you a link to reset your
					password.
				</CardDescription>
			</CardHeader>
			<form onSubmit={onSubmit}>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<div className="relative">
							<Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								id="email"
								type="email"
								placeholder="m@example.com"
								value={email}
								onChange={(e) => onEmailChange(e.target.value)}
								className="pl-10"
								autoComplete="email"
							/>
						</div>
					</div>
					{error && (
						<Alert variant="destructive">
							<AlertDescription>
								Failed to send reset link. Please try again or contact support.
							</AlertDescription>
						</Alert>
					)}
					<Button
						type="submit"
						className="w-full"
						disabled={isPending || !email}
					>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Sending...
							</>
						) : (
							"Send reset link"
						)}
					</Button>
					<Button asChild variant="ghost" className="w-full">
						<Link to="/login">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to login
						</Link>
					</Button>
				</CardContent>
			</form>
		</Card>
	)
}
```

- [ ] **Step 2: Export from index.ts**

Add to `apps/web/src/components/auth/index.ts`:

```typescript
export { ForgotPasswordForm } from "./ForgotPasswordForm"
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/auth/ForgotPasswordForm.tsx apps/web/src/components/auth/index.ts
git commit -m "feat(auth): add ForgotPasswordForm component"
```

---

## Task 5: Create ForgotPasswordSuccess Component

**Files:**
- Create: `apps/web/src/components/auth/ForgotPasswordSuccess.tsx`
- Modify: `apps/web/src/components/auth/index.ts`

**Context:** The success confirmation screen after email is sent.

- [ ] **Step 1: Create ForgotPasswordSuccess.tsx**

Create file `apps/web/src/components/auth/ForgotPasswordSuccess.tsx`:

```typescript
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"

interface ForgotPasswordSuccessProps {
	email: string
}

export function ForgotPasswordSuccess({ email }: ForgotPasswordSuccessProps) {
	return (
		<Card>
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<CheckCircle2 className="h-12 w-12 text-green-500" />
				</div>
				<CardTitle className="text-2xl">Check your email</CardTitle>
				<CardDescription>
					If an account exists with {email}, we&apos;ve sent a password reset link
					to your inbox.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Button asChild variant="outline" className="w-full">
					<Link to="/login">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to login
					</Link>
				</Button>
			</CardContent>
		</Card>
	)
}
```

- [ ] **Step 2: Export from index.ts**

Add to `apps/web/src/components/auth/index.ts`:

```typescript
export { ForgotPasswordSuccess } from "./ForgotPasswordSuccess"
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/auth/ForgotPasswordSuccess.tsx apps/web/src/components/auth/index.ts
git commit -m "feat(auth): add ForgotPasswordSuccess component"
```

---

## Task 6: Refactor forgot-password.tsx Route

**Files:**
- Modify: `apps/web/src/routes/forgot-password.tsx`

**Context:** Replace inline JSX with the new components while keeping state logic in the route.

- [ ] **Step 1: Update imports and component**

Replace the entire content of `apps/web/src/routes/forgot-password.tsx`:

```typescript
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useForgotPassword } from "@/api/hooks/useAuth"
import {
	AuthCard,
	AuthHeader,
	ForgotPasswordForm,
	ForgotPasswordSuccess,
} from "@/components/auth"

export const Route = createFileRoute("/forgot-password")({
	component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
	const [email, setEmail] = useState("")
	const [isSubmitted, setIsSubmitted] = useState(false)
	const forgotPassword = useForgotPassword()

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!email) return

		forgotPassword.mutate(
			{ email },
			{
				onSuccess: () => {
					setIsSubmitted(true)
				},
			},
		)
	}

	return (
		<AuthCard>
			<div className="w-full max-w-sm">
				<AuthHeader />
				{isSubmitted ? (
					<ForgotPasswordSuccess email={email} />
				) : (
					<ForgotPasswordForm
						email={email}
						onEmailChange={setEmail}
						onSubmit={handleSubmit}
						isPending={forgotPassword.isPending}
						error={forgotPassword.error}
					/>
				)}
			</div>
		</AuthCard>
	)
}
```

- [ ] **Step 2: Verify lint and type check pass**

Run: `cd apps/web && bun run check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/forgot-password.tsx
git commit -m "refactor(auth): decompose forgot-password route into components"
```

---

## Task 7: Create ResetPasswordVerifying Component

**Files:**
- Create: `apps/web/src/components/auth/ResetPasswordVerifying.tsx`
- Modify: `apps/web/src/components/auth/index.ts`

**Context:** Loading state while verifying the reset token.

- [ ] **Step 1: Create ResetPasswordVerifying.tsx**

Create file `apps/web/src/components/auth/ResetPasswordVerifying.tsx`:

```typescript
import { Loader2 } from "lucide-react"
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"

export function ResetPasswordVerifying() {
	return (
		<Card className="w-full max-w-sm">
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<Loader2 className="h-12 w-12 animate-spin text-primary" />
				</div>
				<CardTitle className="text-2xl">Verifying link...</CardTitle>
				<CardDescription>
					Please wait while we verify your reset link.
				</CardDescription>
			</CardHeader>
		</Card>
	)
}
```

- [ ] **Step 2: Export from index.ts**

Add to `apps/web/src/components/auth/index.ts`:

```typescript
export { ResetPasswordVerifying } from "./ResetPasswordVerifying"
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/auth/ResetPasswordVerifying.tsx apps/web/src/components/auth/index.ts
git commit -m "feat(auth): add ResetPasswordVerifying component"
```

---

## Task 8: Create ResetPasswordInvalid Component

**Files:**
- Create: `apps/web/src/components/auth/ResetPasswordInvalid.tsx`
- Modify: `apps/web/src/components/auth/index.ts`

**Context:** Invalid or expired token error state.

- [ ] **Step 1: Create ResetPasswordInvalid.tsx**

Create file `apps/web/src/components/auth/ResetPasswordInvalid.tsx`:

```typescript
import { AlertCircle } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"

export function ResetPasswordInvalid() {
	return (
		<Card className="w-full max-w-sm">
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<AlertCircle className="h-12 w-12 text-destructive" />
				</div>
				<CardTitle className="text-2xl">Invalid link</CardTitle>
				<CardDescription>
					This password reset link is invalid or has expired.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<Alert variant="destructive">
					<AlertDescription>
						Please request a new password reset link.
					</AlertDescription>
				</Alert>
				<Button asChild className="w-full">
					<Link to="/forgot-password">Request new link</Link>
				</Button>
			</CardContent>
		</Card>
	)
}
```

- [ ] **Step 2: Export from index.ts**

Add to `apps/web/src/components/auth/index.ts`:

```typescript
export { ResetPasswordInvalid } from "./ResetPasswordInvalid"
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/auth/ResetPasswordInvalid.tsx apps/web/src/components/auth/index.ts
git commit -m "feat(auth): add ResetPasswordInvalid component"
```

---

## Task 9: Create ResetPasswordSuccess Component

**Files:**
- Create: `apps/web/src/components/auth/ResetPasswordSuccess.tsx`
- Modify: `apps/web/src/components/auth/index.ts`

**Context:** Password reset success state with redirect to login.

- [ ] **Step 1: Create ResetPasswordSuccess.tsx**

Create file `apps/web/src/components/auth/ResetPasswordSuccess.tsx`:

```typescript
import { CheckCircle2 } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"

export function ResetPasswordSuccess() {
	return (
		<Card className="w-full max-w-sm">
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<CheckCircle2 className="h-12 w-12 text-green-500" />
				</div>
				<CardTitle className="text-2xl">Password reset!</CardTitle>
				<CardDescription>
					Your password has been reset successfully. Redirecting to login...
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Button asChild className="w-full">
					<Link to="/login">Go to login</Link>
				</Button>
			</CardContent>
		</Card>
	)
}
```

- [ ] **Step 2: Export from index.ts**

Add to `apps/web/src/components/auth/index.ts`:

```typescript
export { ResetPasswordSuccess } from "./ResetPasswordSuccess"
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/auth/ResetPasswordSuccess.tsx apps/web/src/components/auth/index.ts
git commit -m "feat(auth): add ResetPasswordSuccess component"
```

---

## Task 10: Create ResetPasswordForm Component

**Files:**
- Create: `apps/web/src/components/auth/ResetPasswordForm.tsx`
- Modify: `apps/web/src/components/auth/index.ts`

**Context:** The new password input form.

- [ ] **Step 1: Create ResetPasswordForm.tsx**

Create file `apps/web/src/components/auth/ResetPasswordForm.tsx`:

```typescript
import { Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { PasswordInput } from "./PasswordInput"

interface ResetPasswordFormProps {
	password: string
	onPasswordChange: (password: string) => void
	onSubmit: (e: React.FormEvent) => void
	isPending: boolean
	error: string | null
}

export function ResetPasswordForm({
	password,
	onPasswordChange,
	onSubmit,
	isPending,
	error,
}: ResetPasswordFormProps) {
	return (
		<Card className="w-full max-w-sm">
			<CardHeader className="space-y-1">
				<CardTitle className="text-center text-2xl">Reset password</CardTitle>
				<CardDescription className="text-center">
					Enter your new password below.
				</CardDescription>
			</CardHeader>
			<form onSubmit={onSubmit}>
				<CardContent className="space-y-4">
					{error && (
						<Alert variant="destructive">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}
					<PasswordInput
						id="password"
						label="New password"
						value={password}
						onChange={onPasswordChange}
						placeholder="Enter new password"
						autoComplete="new-password"
						disabled={isPending}
						helpText="Must be at least 8 characters"
					/>
					<Button
						type="submit"
						className="w-full"
						disabled={isPending || password.length < 8}
					>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Resetting...
							</>
						) : (
							"Reset password"
						)}
					</Button>
				</CardContent>
			</form>
		</Card>
	)
}
```

- [ ] **Step 2: Export from index.ts**

Add to `apps/web/src/components/auth/index.ts`:

```typescript
export { ResetPasswordForm } from "./ResetPasswordForm"
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/auth/ResetPasswordForm.tsx apps/web/src/components/auth/index.ts
git commit -m "feat(auth): add ResetPasswordForm component"
```

---

## Task 11: Refactor reset-password.tsx Route

**Files:**
- Modify: `apps/web/src/routes/reset-password.tsx`

**Context:** Replace inline JSX with the new components while keeping state logic in the route.

- [ ] **Step 1: Update imports and component**

Replace the entire content of `apps/web/src/routes/reset-password.tsx`:

```typescript
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import {
	useResetPassword,
	useVerifyResetTokenQuery,
} from "@/api/hooks/useAuth"
import {
	AuthCard,
	ResetPasswordForm,
	ResetPasswordInvalid,
	ResetPasswordSuccess,
	ResetPasswordVerifying,
} from "@/components/auth"

export const Route = createFileRoute("/reset-password")({
	component: ResetPasswordPage,
	validateSearch: (search: Record<string, unknown>): { token?: string } => ({
		token: typeof search.token === "string" ? search.token : undefined,
	}),
})

type ResetState =
	| { status: "loading" }
	| { status: "invalid" }
	| { status: "ready" }
	| { status: "success" }
	| { status: "error"; message: string }

function ResetPasswordPage() {
	const { token } = Route.useSearch()
	const navigate = useNavigate()
	const [password, setPassword] = useState("")
	const [state, setState] = useState<ResetState>({ status: "loading" })
	const processedRef = useRef(false)
	const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const {
		isLoading: isVerifying,
		isError: isVerifyError,
		error: verifyError,
	} = useVerifyResetTokenQuery(token)
	const resetPassword = useResetPassword()

	useEffect(() => {
		if (processedRef.current) return
		processedRef.current = true

		if (!token) {
			setState({ status: "invalid" })
			return
		}
	}, [token])

	useEffect(() => {
		if (isVerifying) {
			setState({ status: "loading" })
		} else if (isVerifyError) {
			const errorCode = verifyError?.error?.code
			const isTokenError =
				errorCode === "INVALID_TOKEN" ||
				errorCode === "TOKEN_EXPIRED" ||
				errorCode === "TOKEN_ALREADY_USED"

			if (isTokenError) {
				setState({ status: "invalid" })
			} else {
				setState({
					status: "error",
					message: "Unable to verify link. Please try again later.",
				})
			}
		} else if (token && !isVerifying) {
			setState({ status: "ready" })
		}
	}, [isVerifying, isVerifyError, verifyError, token])

	useEffect(() => {
		return () => {
			if (redirectTimerRef.current) {
				clearTimeout(redirectTimerRef.current)
			}
		}
	}, [])

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!token || !password) return

		resetPassword.mutate(
			{ token, password },
			{
				onSuccess: () => {
					setState({ status: "success" })
					if (redirectTimerRef.current) {
						clearTimeout(redirectTimerRef.current)
					}
					redirectTimerRef.current = setTimeout(() => {
						navigate({ to: "/login" })
					}, 3000)
				},
				onError: (err) => {
					const code = err.error?.code || "UNKNOWN_ERROR"
					let message = "Failed to reset password. Please try again."

					if (code === "INVALID_TOKEN" || code === "TOKEN_EXPIRED") {
						message =
							"This link is invalid or has expired. Please request a new one."
					} else if (code === "TOKEN_ALREADY_USED") {
						message =
							"This link has already been used. Please request a new one."
					}

					setState({ status: "error", message })
				},
			},
		)
	}

	const renderContent = () => {
		switch (state.status) {
			case "loading":
				return <ResetPasswordVerifying />
			case "invalid":
				return <ResetPasswordInvalid />
			case "success":
				return <ResetPasswordSuccess />
			case "ready":
			case "error":
				return (
					<ResetPasswordForm
						password={password}
						onPasswordChange={setPassword}
						onSubmit={handleSubmit}
						isPending={resetPassword.isPending}
						error={state.status === "error" ? state.message : null}
					/>
				)
			default:
				return null
		}
	}

	return <AuthCard>{renderContent()}</AuthCard>
}
```

- [ ] **Step 2: Verify lint and type check pass**

Run: `cd apps/web && bun run check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/reset-password.tsx
git commit -m "refactor(auth): decompose reset-password route into components"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Task 1: Infer PasswordResetToken from Drizzle schema
- ✅ Tasks 2-3: AuthCard and PasswordInput reusable components
- ✅ Tasks 4-5: ForgotPasswordForm and ForgotPasswordSuccess components
- ✅ Task 6: Refactor forgot-password.tsx
- ✅ Tasks 7-10: Reset password state components
- ✅ Task 11: Refactor reset-password.tsx

**2. Placeholder scan:**
- No "TBD", "TODO", "implement later" found
- All component code is complete
- All file paths are exact

**3. Type consistency:**
- ✅ `PasswordResetToken` uses `$inferSelect` from Drizzle
- ✅ Component props are consistently typed
- ✅ Route state types preserved

---

## Verification Steps (Final)

After all tasks complete:

- [ ] Run full typecheck: `bun run check` in both `apps/api` and `apps/web`
- [ ] Verify forgot-password page renders correctly (both states)
- [ ] Verify reset-password page renders all 4 states correctly
- [ ] Verify PasswordInput toggle works
