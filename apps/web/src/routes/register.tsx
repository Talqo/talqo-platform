import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Loader2, Mail } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useRegister, useResendVerificationEmail } from "@/api/hooks/useAuth"
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
import { type RegisterFormType, registerSchema } from "@/schemas"

export const Route = createFileRoute("/register")({
	component: RegisterPage,
})

function RegisterPage() {
	const register = useRegister()
	const resendVerification = useResendVerificationEmail()
	const [showSuccess, setShowSuccess] = useState(false)
	const [registeredEmail, setRegisteredEmail] = useState("")
	const [resendSuccess, setResendSuccess] = useState(false)
	const [resendTimeout, setResendTimeout] = useState(0)
	const [canResend, setCanResend] = useState(true)

	useEffect(() => {
		if (resendTimeout > 0) {
			const timer = setTimeout(() => {
				setResendTimeout((prev) => prev - 1)
			}, 1000)
			return () => clearTimeout(timer)
		}
		if (resendTimeout === 0 && !canResend) {
			setCanResend(true)
		}
		return undefined
	}, [resendTimeout, canResend])

	const form = useForm<RegisterFormType>({
		resolver: zodResolver(registerSchema),
		defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
		mode: "onBlur",
	})

	const onSubmit = (values: RegisterFormType) => {
		if (register.isPending) return
		register.mutate(
			{ name: values.name, email: values.email, password: values.password },
			{
				onSuccess: () => {
					setRegisteredEmail(values.email)
					setShowSuccess(true)
				},
			},
		)
	}

	const handleResend = () => {
		if (!registeredEmail || !canResend) return
		setCanResend(false)
		setResendTimeout(60)
		resendVerification.mutate(
			{ email: registeredEmail },
			{ onSuccess: () => setResendSuccess(true) },
		)
	}

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
							{resendSuccess && (
								<Alert>
									<AlertDescription>
										Verification email sent. Please check your inbox.
									</AlertDescription>
								</Alert>
							)}
						</CardContent>
						<CardFooter className="flex flex-col gap-2">
							<Button
								variant="outline"
								className="w-full"
								onClick={handleResend}
								disabled={!canResend || resendVerification.isPending}
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
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} noValidate>
							<CardContent className="space-y-4">
								{register.error && (
									<Alert variant="destructive">
										<AlertDescription>
											{register.error.error?.message ||
												"Registration failed. Please try again."}
										</AlertDescription>
									</Alert>
								)}
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Name</FormLabel>
											<FormControl>
												<Input
													type="text"
													placeholder="John Doe"
													autoComplete="name"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="email"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Email</FormLabel>
											<FormControl>
												<Input
													type="email"
													placeholder="m@example.com"
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
											<FormLabel>Password</FormLabel>
											<FormControl>
												<Input
													type="password"
													autoComplete="new-password"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="confirmPassword"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Confirm Password</FormLabel>
											<FormControl>
												<Input
													type="password"
													autoComplete="new-password"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
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
					</Form>
				</Card>
			</div>
		</div>
	)
}
