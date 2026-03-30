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
import { registerSchema } from "@/schemas";

interface RegisterFormData extends Record<string, string> {
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

export function RegisterPage() {
	const navigate = useNavigate();

	const { values, errors, touched, handleChange, handleBlur, handleSubmit } =
		useForm<RegisterFormData>({
			initialValues: { email: "", password: "", confirmPassword: "" },
			validate: validateRegisterForm,
			onSubmit: async () => {
				// Simulated registration - replace with actual API call
				navigate({ to: "/dashboard" });
			},
		});

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
							Enter your email below to create your account
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
							<Button className="w-full" type="submit">
								Create account
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
