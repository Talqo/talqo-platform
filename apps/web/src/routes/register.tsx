import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Mail } from "lucide-react";
import { useState } from "react";
import type { RegisterInput } from "shared";
import { useRegister } from "@/api/hooks/useAuth";
import { AuthFormField, AuthHeader } from "@/components/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

export const Route = createFileRoute("/register")({
	component: RegisterPage,
});

interface RegisterFormData extends Record<string, string>, RegisterInput {
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

function RegisterPage() {
	const register = useRegister();
	const [showSuccess, setShowSuccess] = useState(false);
	const [registeredEmail, setRegisteredEmail] = useState("");

	const { values, errors, touched, handleChange, handleBlur, handleSubmit } =
		useForm<RegisterFormData>({
			initialValues: { name: "", email: "", password: "", confirmPassword: "" },
			validate: validateRegisterForm,
			onSubmit: async () => {
				// Guard against concurrent submissions
				if (register.isPending) return;
				register.mutate(
					{
						name: values.name,
						email: values.email,
						password: values.password,
					},
					{
						onSuccess: () => {
							setRegisteredEmail(values.email);
							setShowSuccess(true);
						},
						// Error handling is done via register.error
					},
				);
			},
		});

	// Success state - show confirmation
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
						<CardFooter className="flex flex-col gap-2">
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
		);
	}

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
							Enter your details below to create your account
						</CardDescription>
					</CardHeader>
					<form onSubmit={handleSubmit} noValidate>
						<CardContent className="space-y-4">
							{register.error && (
								<Alert variant="destructive">
									<AlertDescription>
										{register.error.error?.message ||
											"Registration failed. Please try again."}
									</AlertDescription>
								</Alert>
							)}
							<AuthFormField
								id="name"
								name="name"
								label="Name"
								type="text"
								placeholder="John Doe"
								value={values.name}
								onChange={handleChange("name")}
								onBlur={handleBlur("name")}
								error={errors.name}
								showError={touched.name && !!errors.name}
								errorId="name-error"
								autoComplete="name"
							/>
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
							<Button
								className="w-full"
								type="submit"
								disabled={register.isPending}
							>
								{register.isPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Creating account...
									</>
								) : (
									"Create account"
								)}
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
