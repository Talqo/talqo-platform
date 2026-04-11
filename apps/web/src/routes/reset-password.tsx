import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import {
	AlertCircle,
	CheckCircle2,
	Eye,
	EyeOff,
	Loader2,
	Lock,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useResetPassword, useVerifyResetTokenQuery } from "@/api/hooks/useAuth"
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
	const [showPassword, setShowPassword] = useState(false)
	const [state, setState] = useState<ResetState>({ status: "loading" })
	const processedRef = useRef(false)

	const { isLoading: isVerifying, isError: isVerifyError } =
		useVerifyResetTokenQuery(token)
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
			setState({ status: "invalid" })
		} else if (token && !isVerifying) {
			setState({ status: "ready" })
		}
	}, [isVerifying, isVerifyError, token])

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!token || !password) return

		resetPassword.mutate(
			{ token, password },
			{
				onSuccess: () => {
					setState({ status: "success" })
					setTimeout(() => {
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

	if (state.status === "loading") {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
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
			</div>
		)
	}

	if (state.status === "invalid") {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
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
			</div>
		)
	}

	if (state.status === "success") {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
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
			</div>
		)
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
			<Card className="w-full max-w-sm">
				<CardHeader className="space-y-1">
					<CardTitle className="text-center text-2xl">Reset password</CardTitle>
					<CardDescription className="text-center">
						Enter your new password below.
					</CardDescription>
				</CardHeader>
				<form onSubmit={handleSubmit}>
					<CardContent className="space-y-4">
						{state.status === "error" && (
							<Alert variant="destructive">
								<AlertDescription>{state.message}</AlertDescription>
							</Alert>
						)}
						<div className="space-y-2">
							<Label htmlFor="password">New password</Label>
							<div className="relative">
								<Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									id="password"
									type={showPassword ? "text" : "password"}
									placeholder="Enter new password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="pl-10 pr-10"
									autoComplete="new-password"
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
									onClick={() => setShowPassword(!showPassword)}
								>
									{showPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</Button>
							</div>
							<p className="text-muted-foreground text-xs">
								Must be at least 8 characters
							</p>
						</div>
						<Button
							type="submit"
							className="w-full"
							disabled={resetPassword.isPending || password.length < 8}
						>
							{resetPassword.isPending ? (
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
		</div>
	)
}
