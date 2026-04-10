# Verify Email Page Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix two critical issues: 1) User gets stuck at "Verifying your email..." loading screen, and 2) Add resend email button to register success page.

**Architecture:** React Query mutations for API calls, TanStack Router, useRef for StrictMode guard, localStorage for tokens.

**Tech Stack:** React, TypeScript, TanStack Router, TanStack Query

---

## Issue Analysis

### Issue 1: Stuck at "Verifying your email..."

**Root cause:** The `hasProcessed` ref logic in `verify-email.tsx` doesn't work correctly with React StrictMode. When StrictMode double-mounts:
1. First mount: `hasProcessed.current = false` → runs API → sets `hasProcessed.current = true`
2. Component unmounts (StrictMode behavior)
3. Second mount: `hasProcessed.current = true` → effect returns early → stuck in loading state

**Current broken code (lines 39-87):**
```typescript
const hasProcessed = useRef(false)

useEffect(() => {
    if (hasProcessed.current) return  // Returns on second StrictMode mount
    hasProcessed.current = true
    // API call never happens on second mount
}, [token, navigate, verifyEmail.mutate])
```

### Issue 2: Missing resend button on register success

**Location:** register.tsx lines 72-103 - the success state shows "Check your email!" but no way to resend if email doesn't arrive.

---

## Task 1: Fix Stuck Loading in verify-email.tsx

**Files:**
- Modify: `apps/web/src/routes/verify-email.tsx:30-90`

**Problem:** React StrictMode double-mount causes the `hasProcessed` ref to persist between mounts, preventing the API call on the second mount.

**Solution:** Instead of relying on a ref that persists, track processing state in the component state itself. Also add proper cleanup for the setTimeout.

- [ ] **Step 1.1: Read current verify-email.tsx implementation**

```bash
cat apps/web/src/routes/verify-email.tsx | head -100
```

- [ ] **Step 1.2: Replace useEffect with working implementation**

Replace lines 32-87 in `apps/web/src/routes/verify-email.tsx`:

```typescript
function VerifyEmailPage() {
	const { token } = Route.useSearch()
	const navigate = useNavigate()
	const [state, setState] = useState<VerificationState>({ status: "loading" })
	const [resendEmail, setResendEmail] = useState("")
	const [resendSuccess, setResendSuccess] = useState(false)
	const verifyEmail = useVerifyEmail()
	const resendVerification = useResendVerificationEmail()

	useEffect(() => {
		// Guard: only run when in loading state (prevents re-running after error/success)
		if (state.status !== "loading") return

		if (!token) {
			setState({
				status: "error",
				code: "MISSING_TOKEN",
				message: "Verification token is missing. Please check your email link.",
			})
			return
		}

		// Call verify endpoint - track that we're processing via state, not ref
		let timeoutId: ReturnType<typeof setTimeout> | null = null

		verifyEmail.mutate(
			{ token },
			{
				onSuccess: (data) => {
					setState({ status: "success" })
					if (data.data.token) {
						localStorage.setItem(AUTH.TOKEN_KEY, data.data.token)
					}
					timeoutId = setTimeout(() => {
						navigate({ to: "/dashboard" })
					}, 2000)
				},
				onError: (error) => {
					const code = error.error?.code || "UNKNOWN_ERROR"
					let message = "Verification failed. Please try again."

					if (code === "INVALID_TOKEN") {
						message =
							"The verification link is invalid. Please request a new one."
					} else if (code === "TOKEN_EXPIRED") {
						message =
							"The verification link has expired. Please register again."
					} else if (code === "EMAIL_ALREADY_VERIFIED") {
						message =
							"This email has already been verified. You can log in now."
					}

					setState({ status: "error", code, message })
				},
			},
		)

		// Cleanup timeout on unmount
		return () => {
			if (timeoutId) clearTimeout(timeoutId)
		}
	}, [token, navigate, state.status])
```

- [ ] **Step 1.3: Remove unused hasProcessed ref**

Ensure the `useRef` import is still used (if not, it's fine to leave as biome will handle it). The key change is using `state.status !== "loading"` as the guard instead of `hasProcessed.current`.

- [ ] **Step 1.4: Run Biome format**

```bash
cd D:/MUNI/weby/pb138 && bun run check
```

If errors: `bun run fix`

- [ ] **Step 1.5: Commit the fix**

```bash
git add apps/web/src/routes/verify-email.tsx
git commit -m "fix(auth): fix stuck loading state in verify-email page"
```

---

## Task 2: Add Resend Button to Register Success Page

**Files:**
- Modify: `apps/web/src/routes/register.tsx:72-103`

**Problem:** After successful registration, users see "Check your email!" but have no way to resend the email if it doesn't arrive.

**Solution:** Add a resend email form to the success state, similar to verify-email.tsx.

- [ ] **Step 2.1: Add required imports**

In `apps/web/src/routes/register.tsx`, add to imports:
```typescript
import { Input } from "@/components/ui/input"
import { useResendVerificationEmail } from "@/api/hooks/useAuth"
```

- [ ] **Step 2.2: Update RegisterPage component**

Add state and hooks after line 43:
```typescript
function RegisterPage() {
	const register = useRegister()
	const resendVerification = useResendVerificationEmail()
	const [showSuccess, setShowSuccess] = useState(false)
	const [registeredEmail, setRegisteredEmail] = useState("")
	const [resendSuccess, setResendSuccess] = useState(false)
	const [showResendForm, setShowResendForm] = useState(false)
```

- [ ] **Step 2.3: Add resend handler function**

Add before return statement (around line 68):
```typescript
	const handleResend = () => {
		if (!registeredEmail) return
		resendVerification.mutate(
			{ email: registeredEmail },
			{
				onSuccess: () => {
					setResendSuccess(true)
				},
			},
		)
	}
```

- [ ] **Step 2.4: Replace success state JSX**

Replace lines 72-103 (the entire success return block) with:

```typescript
if (showSuccess) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
				<div className="w-full max-w-sm">
					<AuthHeader />
					<Card>
						<CardHeader className="space-y-1 text-center">
							<div className="mb-4 flex justify-center">
								<Mail className="h-12 w-12 text-primary" />
							</div>
							<CardTitle className="text-2xl">Check your email!</CardTitle>
							<CardDescription>
								We've sent a verification link to{" "}
								<span className="font-medium text-foreground">
									{registeredEmail}
								</span>
								. Click it to activate your account.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{resendSuccess ? (
								<Alert>
									<AlertDescription>
										If a pending registration exists, a verification email has been sent.
									</AlertDescription>
								</Alert>
							) : showResendForm ? (
								<div className="flex gap-2">
									<Input
										type="email"
										placeholder="Confirm your email"
										value={registeredEmail}
										readOnly
										disabled={resendVerification.isPending}
									/>
									<Button
										onClick={handleResend}
										disabled={resendVerification.isPending}
										variant="outline"
									>
										{resendVerification.isPending ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											"Resend"
										)}
									</Button>
								</div>
							) : null}
						</CardContent>
						<CardFooter className="flex flex-col gap-2">
							{!showResendForm && (
								<Button
									variant="outline"
									className="w-full"
									onClick={() => setShowResendForm(true)}
								>
									Resend verification email
								</Button>
							)}
							<Button asChild className="w-full">
								<Link to="/login">Go to login</Link>
							</Button>
							<Button asChild variant="ghost" className="w-full">
								<Link to="/">Back to home</Link>
							</Button>
						</CardFooter>
					</Card>
				</div>
			</div>
		)
	}
```

- [ ] **Step 2.5: Run Biome check**

```bash
cd D:/MUNI/weby/pb138 && bun run check
```

If errors: `bun run fix`

- [ ] **Step 2.6: Commit the changes**

```bash
git add apps/web/src/routes/register.tsx
git commit -m "feat(auth): add resend email button to register success page"
```

---

## Summary After Completion

1. **verify-email.tsx**: Now uses `state.status !== "loading"` guard instead of ref, with proper cleanup. This fixes StrictMode double-mount issue.

2. **register.tsx**: Success state now shows a "Resend verification email" button that appears on click, then allows resending the email.

Test both pages after completion:
- Register page success state should show "Resend verification email" button
- Verify-email page should not get stuck on "Verifying your email..."
