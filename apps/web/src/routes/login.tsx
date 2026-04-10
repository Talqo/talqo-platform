import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import type { LoginInput } from "shared"
import { useUnifiedLogin } from "@/api/hooks/useAuth"
import { AuthFormField, AuthHeader } from "@/components/auth"
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
import { AUTH } from "@/lib/constants"
import { useForm } from "@/lib/useForm"
import { loginSchema } from "@/schemas"

export const Route = createFileRoute("/login")({
	component: LoginPage,
})

interface LoginFormData extends Record<string, string>, LoginInput {}

const validateLoginForm = (values: LoginFormData) => {
	const result = loginSchema.safeParse(values)
	if (result.success) return {}

	const errors: Partial<Record<keyof LoginFormData, string>> = {}
	for (const issue of result.error.issues) {
		const path = issue.path[0] as keyof LoginFormData
		errors[path] = issue.message
	}
	return errors
}

function LoginPage() {
	const navigate = useNavigate()
	const { mutate: login, isPending, error } = useUnifiedLogin()

	const { values, errors, touched, handleChange, handleBlur, handleSubmit } =
		useForm<LoginFormData>({
			initialValues: { email: "", password: "" },
			validate: validateLoginForm,
			onSubmit: async () => {
				login(
					{ email: values.email, password: values.password },
					{
						onSuccess: (role) => {
							// Redirect based on role
							if (role === "admin") {
								navigate({ to: AUTH.ADMIN_DEFAULT_REDIRECT })
							} else {
								navigate({ to: AUTH.DEFAULT_REDIRECT })
							}
						},
					},
				)
			},
		})

	// Determine error message - unified hook only shows error after both attempts fail
	let errorMessage: string | null = null
	if (error) {
		if (error.error?.code === "INVALID_CREDENTIALS") {
			errorMessage = "Invalid email or password. Please try again."
		} else {
			errorMessage = error.error?.message || "Login failed. Please try again."
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
							<Button className="w-full" type="submit" disabled={isPending}>
								{isPending ? (
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
	)
}
