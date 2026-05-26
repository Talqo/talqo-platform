import { zodResolver } from "@hookform/resolvers/zod"
import {
	createFileRoute,
	Link,
	redirect,
	useNavigate,
} from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import type { LoginInput } from "shared"
import { useUnifiedLogin } from "@/api/hooks/useAuth"
import { AuthHeader } from "@/components/auth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
	clearAdminToken,
	clearClientToken,
	getAdminToken,
	getClientToken,
	validateToken,
} from "@/lib/auth"
import { AUTH } from "@/lib/constants"
import { loginSchema } from "@/schemas"

// Check auth and redirect based on role before loading the page
async function checkAuthAndRedirect() {
	const clientToken = getClientToken()
	const adminToken = getAdminToken()

	// If no tokens, allow access to login page
	if (!clientToken && !adminToken) {
		return
	}

	// Check both tokens in parallel
	const [clientResult, adminResult] = await Promise.all([
		clientToken
			? validateToken(clientToken, "/client/me")
			: { valid: false, shouldClear: false },
		adminToken
			? validateToken(adminToken, "/admin/me")
			: { valid: false, shouldClear: false },
	])

	// Clear invalid tokens
	if (clientResult.shouldClear) {
		clearClientToken()
	}
	if (adminResult.shouldClear) {
		clearAdminToken()
	}

	// Redirect based on which token is valid (client takes priority if both valid)
	if (clientResult.valid) {
		throw redirect({
			to: AUTH.DEFAULT_REDIRECT,
			replace: true,
		})
	}

	if (adminResult.valid) {
		throw redirect({
			to: AUTH.ADMIN_DEFAULT_REDIRECT,
			replace: true,
		})
	}

	// No valid tokens - allow access to login page
}

export const Route = createFileRoute("/login")({
	beforeLoad: checkAuthAndRedirect,
	component: LoginPage,
})

function LoginPage() {
	const navigate = useNavigate()
	const { mutate: login, isPending, error } = useUnifiedLogin()
	const { t } = useTranslation()

	const form = useForm<LoginInput>({
		resolver: zodResolver(loginSchema),
		defaultValues: { email: "", password: "" },
		mode: "onBlur",
	})

	const onSubmit = (values: LoginInput) => {
		login(values, {
			onSuccess: (role) => {
				if (role === "admin") {
					navigate({ to: AUTH.ADMIN_DEFAULT_REDIRECT })
				} else {
					navigate({ to: AUTH.DEFAULT_REDIRECT })
				}
			},
		})
	}

	let errorMessage: string | null = null
	if (error) {
		if (error.error?.code === "UNAUTHORIZED") {
			errorMessage = t("auth.login.invalidCredentials")
		} else {
			errorMessage = error.error?.message || t("auth.login.loginFailed")
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
			<div className="w-full max-w-sm">
				<AuthHeader />

				<Card>
					<CardHeader className="space-y-1">
						<CardTitle className="text-center text-2xl">
							{t("auth.login.title")}
						</CardTitle>
						<CardDescription className="text-center">
							{t("auth.login.description")}
						</CardDescription>
					</CardHeader>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} noValidate>
							<CardContent className="space-y-4">
								{errorMessage && (
									<Alert variant="destructive">
										<AlertDescription>{errorMessage}</AlertDescription>
									</Alert>
								)}
								<FormField
									control={form.control}
									name="email"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("common.email")}</FormLabel>
											<FormControl>
												<Input
													type="email"
													placeholder={t("auth.login.emailPlaceholder")}
													autoComplete="email"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="password"
									render={({ field }) => (
										<FormItem>
											<div className="flex items-center justify-between">
												<FormLabel>{t("common.password")}</FormLabel>
												<Link
													to="/forgot-password"
													className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
												>
													{t("auth.login.forgotPassword")}
												</Link>
											</div>
											<FormControl>
												<Input
													type="password"
													autoComplete="current-password"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</CardContent>
							<CardFooter className="flex flex-col">
								<Button className="w-full" type="submit" disabled={isPending}>
									{isPending ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											{t("auth.login.submitting")}
										</>
									) : (
										t("auth.login.title")
									)}
								</Button>
								<div className="mt-4 text-center text-muted-foreground text-sm">
									{t("auth.login.noAccount")}{" "}
									<Link
										to="/register"
										className="rounded-md border border-primary/50 px-3 py-1 font-medium text-primary underline underline-offset-4 hover:border-primary hover:text-primary/80"
									>
										{t("auth.login.signUp")}
									</Link>
								</div>
							</CardFooter>
						</form>
					</Form>
				</Card>
			</div>
		</div>
	)
}
