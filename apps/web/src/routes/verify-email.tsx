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
import { useTranslation } from "react-i18next"
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
	const { t } = useTranslation()
	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={toggleTheme}
			className="absolute top-4 right-4"
			aria-label={
				theme === "dark"
					? t("common.switchToLightMode")
					: t("common.switchToDarkMode")
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
	const { t } = useTranslation()
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

	const handleResend = async () => {
		if (!resendEmail || !canResend) return
		try {
			await resendVerification.mutateAsync({ email: resendEmail })
			setResendSuccess(true)
			setCanResend(false)
			setResendTimeout(60)
		} catch {
			setResendSuccess(false)
		}
	}

	useEffect(() => {
		if (processedRef.current) return
		processedRef.current = true

		if (!token) {
			setState({
				status: "error",
				code: "MISSING_TOKEN",
				message: t("auth.verifyEmail.missingToken"),
			})
			return
		}

		async function verify() {
			try {
				const data = await verifyEmail.mutateAsync({ token })
				setState({ status: "success" })
				if (data.token) {
					localStorage.setItem(AUTH.TOKEN_KEY, data.token)
				}
				setTimeout(() => {
					navigate({ to: "/dashboard" })
				}, 2000)
			} catch (err) {
				const error = err as ApiError
				const code = error.error?.code || "UNKNOWN_ERROR"
				let message = t("auth.verifyEmail.verificationFailed")

				if (code === "INVALID_TOKEN") {
					message = t("auth.verifyEmail.invalidToken")
				} else if (code === "TOKEN_EXPIRED") {
					message = t("auth.verifyEmail.tokenExpired")
				} else if (code === "EMAIL_ALREADY_VERIFIED") {
					message = t("auth.verifyEmail.alreadyVerified")
				}

				setState({ status: "error", code, message })
			}
		}

		verify()
		// Only run when token changes (on initial load with token from URL)
	}, [token, navigate, verifyEmail, t])

	if (state.status === "loading") {
		return (
			<div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-12">
				<ThemeToggleButton />
				<Card className="w-full max-w-md">
					<CardHeader className="text-center">
						<div className="mb-4 flex justify-center">
							<Loader2 className="h-12 w-12 animate-spin text-primary" />
						</div>
						<CardTitle className="text-2xl">
							{t("auth.verifyEmail.verifyingTitle")}
						</CardTitle>
						<CardDescription>
							{t("auth.verifyEmail.verifyingDescription")}
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
						<CardTitle className="text-2xl">
							{t("auth.verifyEmail.successTitle")}
						</CardTitle>
						<CardDescription>
							{t("auth.verifyEmail.successDescription")}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button asChild className="w-full">
							<Link to="/dashboard">{t("auth.verifyEmail.goToDashboard")}</Link>
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
					<CardTitle className="text-2xl">
						{t("auth.verifyEmail.failedTitle")}
					</CardTitle>
					<CardDescription>
						{t("auth.verifyEmail.failedDescription")}
					</CardDescription>
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
								{t("auth.verifyEmail.needNewLink")}
							</h3>
						</div>
						{resendSuccess ? (
							<Alert>
								<AlertDescription>
									{t("auth.verifyEmail.verificationSent")}
								</AlertDescription>
							</Alert>
						) : (
							<>
								<div className="space-y-2">
									<Label htmlFor="resend-email" className="text-xs">
										{t("auth.verifyEmail.emailAddress")}
									</Label>
									<Input
										id="resend-email"
										type="email"
										placeholder={t("auth.verifyEmail.emailPlaceholder")}
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
											{t("auth.verifyEmail.sending")}
										</>
									) : !canResend ? (
										t("auth.verifyEmail.resendIn", {
											seconds: resendTimeout,
										})
									) : (
										t("auth.verifyEmail.resendVerification")
									)}
								</Button>
							</>
						)}
					</div>

					<div className="flex flex-col gap-2">
						<Button asChild variant="outline" className="w-full">
							<Link to="/register">{t("auth.verifyEmail.registerAgain")}</Link>
						</Button>
						<Button asChild variant="ghost" className="w-full">
							<Link to="/login">{t("auth.login.title")}</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
