import { Link, useNavigate } from "@tanstack/react-router";
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
import { useForm } from "@/lib/useForm";
import { loginSchema } from "@/schemas";

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

export function LoginPage() {
	const navigate = useNavigate();

	const { values, errors, touched, handleChange, handleBlur, handleSubmit } =
		useForm<LoginFormData>({
			initialValues: { email: "", password: "" },
			validate: validateLoginForm,
			onSubmit: async () => {
				// Simulated login - replace with actual API call
				navigate({ to: "/dashboard" });
			},
		});

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
							<Button className="w-full" type="submit">
								Log in
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
