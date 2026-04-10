import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useVerifyEmail } from "@/api/hooks/useAuth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { AUTH } from "@/lib/constants"

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
	const verifyEmail = useVerifyEmail()

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

		// Call verify endpoint
		verifyEmail.mutate(
			{ token },
			{
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		token,
		navigate,
		state.status, // Call verify endpoint
		verifyEmail.mutate,
	])

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
		)
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
		<div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
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
