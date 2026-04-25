import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import { ArrowLeft, Loader2, Mail } from "lucide-react"
import { useForm } from "react-hook-form"
import type { ForgotPasswordInput } from "shared"
import { ForgotPasswordSchema } from "shared"
import type { ApiError } from "@/api/hooks/useAuth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
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

type ForgotPasswordFormProps = {
	onSubmit: (email: string) => void
	isPending: boolean
	error: ApiError | null
}

export function ForgotPasswordForm({
	onSubmit,
	isPending,
	error,
}: ForgotPasswordFormProps) {
	const form = useForm<ForgotPasswordInput>({
		resolver: zodResolver(ForgotPasswordSchema),
		defaultValues: { email: "" },
		mode: "onBlur",
	})

	return (
		<Card>
			<CardHeader className="space-y-1">
				<CardTitle className="text-center text-2xl">Forgot password?</CardTitle>
				<CardDescription className="text-center">
					Enter your email address and we&apos;ll send you a link to reset your
					password.
				</CardDescription>
			</CardHeader>
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit((values) => onSubmit(values.email))}
					noValidate
				>
					<CardContent className="space-y-4">
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<div className="relative">
											<Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
											<Input
												type="email"
												placeholder="m@example.com"
												autoComplete="email"
												className="pl-10"
												{...field}
											/>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						{error && (
							<Alert variant="destructive">
								<AlertDescription>
									Failed to send reset link. Please try again or contact
									support.
								</AlertDescription>
							</Alert>
						)}
						<Button type="submit" className="w-full" disabled={isPending}>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Sending...
								</>
							) : (
								"Send reset link"
							)}
						</Button>
						<Button asChild variant="ghost" className="w-full">
							<Link to="/login">
								<ArrowLeft className="mr-2 h-4 w-4" />
								Back to login
							</Link>
						</Button>
					</CardContent>
				</form>
			</Form>
		</Card>
	)
}
