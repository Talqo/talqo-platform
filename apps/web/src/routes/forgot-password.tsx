import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react"
import { useState } from "react"
import { useForgotPassword } from "@/api/hooks/useAuth"
import { AuthHeader } from "@/components/auth"
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

export const Route = createFileRoute("/forgot-password")({
	component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
	const [email, setEmail] = useState("")
	const [isSubmitted, setIsSubmitted] = useState(false)
	const forgotPassword = useForgotPassword()

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!email) return

		forgotPassword.mutate(
			{ email },
			{
				onSuccess: () => {
					setIsSubmitted(true)
				},
			},
		)
	}

	if (isSubmitted) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
				<div className="w-full max-w-sm">
					<AuthHeader />
					<Card>
						<CardHeader className="text-center">
							<div className="mb-4 flex justify-center">
								<CheckCircle2 className="h-12 w-12 text-green-500" />
							</div>
							<CardTitle className="text-2xl">Check your email</CardTitle>
							<CardDescription>
								If an account exists with {email}, we&apos;ve sent a password
								reset link to your inbox.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button asChild variant="outline" className="w-full">
								<Link to="/login">
									<ArrowLeft className="mr-2 h-4 w-4" />
									Back to login
								</Link>
							</Button>
						</CardContent>
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
							Forgot password?
						</CardTitle>
						<CardDescription className="text-center">
							Enter your email address and we&apos;ll send you a link to reset
							your password.
						</CardDescription>
					</CardHeader>
					<form onSubmit={handleSubmit}>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<div className="relative">
									<Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
									<Input
										id="email"
										type="email"
										placeholder="m@example.com"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										className="pl-10"
										autoComplete="email"
									/>
								</div>
							</div>
							<Button
								type="submit"
								className="w-full"
								disabled={forgotPassword.isPending || !email}
							>
								{forgotPassword.isPending ? (
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
				</Card>
			</div>
		</div>
	)
}
