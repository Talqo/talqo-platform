import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import {
	AlertCircle,
	CheckCircle2,
	Loader2,
	Mail,
	Moon,
	Sun,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import {
	type ApiError,
	useResendVerificationEmail,
	useVerifyEmail,
} from "@/api/hooks/useAuth"
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
import { AUTH } from "@/lib/constants"
import { useTheme } from "@/lib/useTheme"

function ThemeToggleButton() {
	const { theme, toggleTheme } = useTheme()
	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={toggleTheme}
			className="absolute top-4 right-4"
			aria-label={
				theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
			}
		>
			{theme === "dark" ? (
				<Sun className="h-5 w-5" />
			) : (
				<Moon className="h-5 w-5" />
			)}
		</Button>
	)
}

export const Route = createFileRoute("/verify-email")({
	component: VerifyEmailPage,
	validateSearch: (search: Record<string, unknown>): { token?: string } => ({
		token: typeof search.token === "string" ? search.token : undefined,
	}),
})

type VerificationState =
	| { status: "loading" }
	| { status: "success" }
	| { status: "error"; code: string; message: string }

function VerifyEmailPage() {
	const { token } = Route.useSearch()
	const navigate = useNavigate()
	const [state, setState] = useState<VerificationState>({ status: "loading" })
	const [resendEmail, setResendEmail] = useState("")
	const [resendSuccess, setResendSuccess] = useState(false)
	const [resendTimeout, setResendTimeout] = useState(0)
	const [canResend, setCanResend] = useState(true)
	const verifyEmail = useVerifyEmail()
	const resendVerification = useResendVerificationEmail()
	const processedRef = useRef(false)

	useEffect(() => {
		if (resendTimeout > 0) {
			const timer = setTimeout(() => {
				setResendTimeout((prev) => prev - 1)
			}, 1000)
			return () => clearTimeout(timer)
		}
		if (resendTimeout === 0 && !canResend) {
			setCanResend(true)
			setResendSuccess(false)
		}
		return undefined
	}, [resendTimeout, canResend])

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
					setResendSuccess(false)
				},
			},
		)
	}

	useEffect(() => {
		// Guard: only run once (prevents StrictMode double execution)
		if (processedRef.current) return
		processedRef.current = true

		if (!token) {
			setState({
				status: "error",
				code: "MISSING_TOKEN",
				message: "Verification token is missing. Please check your email link.",
			})
			return
		}

		// Call verify endpoint using mutateAsync for better promise handling
		verifyEmail
			.mutateAsync({ token })
			.then((data) => {
				setState({ status: "success" })
				if (data.token) {
					localStorage.setItem(AUTH.TOKEN_KEY, data.token)
				}
				// Navigate after 2 seconds
				setTimeout(() => {
					navigate({ to: "/dashboard" })
				}, 2000)
			})
			.catch((err) => {
				const error = err as ApiError
				const code = error.error?.code || "UNKNOWN_ERROR"
				let message = "Verification failed. Please try again."

				if (code === "INVALID_TOKEN") {
					message =
						"The verification link is invalid. Please request a new one."
				} else if (code === "TOKEN_EXPIRED") {
					message = "The verification link has expired. Please register again."
				} else if (code === "EMAIL_ALREADY_VERIFIED") {
					message = "This email has already been verified. You can log in now."
				}

				setState({ status: "error", code, message })
			})
		// navigate and verifyEmail are stable references from TanStack Router/Query
		// Only run when token changes (on initial load with token from URL)
	}, [token, navigate, verifyEmail])

	if (state.status === "loading") {
		return (
			<div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
				<ThemeToggleButton />
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
		)
	}

	if (state.status === "success") {
		return (
			<div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
				<ThemeToggleButton />
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<div className="mb-4 flex justify-center">
							<CheckCircle2 className="h-12 w-12 text-green-500" />
						</div>
						<CardTitle className="text-2xl">Email verified!</CardTitle>
						<CardDescription>
							Your email has been verified successfully. Redirecting to
							dashboard...
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button asChild className="w-full">
							<Link to="/dashboard">Go to dashboard</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
			<ThemeToggleButton />
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="mb-4 flex justify-center">
						<AlertCircle className="h-12 w-12 text-destructive" />
					</div>
					<CardTitle className="text-2xl">Verification failed</CardTitle>
					<CardDescription>We couldn't verify your email.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<Alert variant="destructive">
						<AlertDescription>{state.message}</AlertDescription>
					</Alert>

					{/* Resend verification section */}
					<div className="space-y-3 rounded-lg border bg-card p-4">
						<div className="flex items-center gap-2">
							<Mail className="h-4 w-4 text-muted-foreground" />
							<h3 className="font-medium text-sm">
								Need a new verification link?
							</h3>
						</div>
						{resendSuccess ? (
							<Alert>
								<AlertDescription>
									Verification email sent. Please check your inbox.
								</AlertDescription>
							</Alert>
						) : (
							<>
								<div className="space-y-2">
									<Label htmlFor="resend-email" className="text-xs">
										Email address
									</Label>
									<Input
										id="resend-email"
										type="email"
										placeholder="Enter your email"
										value={resendEmail}
										onChange={(e) => setResendEmail(e.target.value)}
									/>
								</div>
								<Button
									variant="outline"
									className="w-full"
									onClick={handleResend}
									disabled={
										!canResend || resendVerification.isPending || !resendEmail
									}
								>
									{resendVerification.isPending ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Sending...
										</>
									) : !canResend ? (
										`Resend available in ${resendTimeout}s`
									) : (
										"Resend verification email"
									)}
								</Button>
							</>
						)}
					</div>

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
	)
}
