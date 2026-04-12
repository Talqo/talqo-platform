import { Link } from "@tanstack/react-router"
import { ArrowLeft, Loader2, Mail } from "lucide-react"
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

interface ForgotPasswordFormProps {
	email: string
	onEmailChange: (email: string) => void
	onSubmit: (e: React.FormEvent) => void
	isPending: boolean
	error: Error | null
}

export function ForgotPasswordForm({
	email,
	onEmailChange,
	onSubmit,
	isPending,
	error,
}: ForgotPasswordFormProps) {
	return (
		<Card>
			<CardHeader className="space-y-1">
				<CardTitle className="text-center text-2xl">Forgot password?</CardTitle>
				<CardDescription className="text-center">
					Enter your email address and we&apos;ll send you a link to reset your
					password.
				</CardDescription>
			</CardHeader>
			<form onSubmit={onSubmit}>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<div className="relative">
							<Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								id="email"
								type="email"
								placeholder="m@example.com"
								value={email}
								onChange={(e) => onEmailChange(e.target.value)}
								className="pl-10"
								autoComplete="email"
							/>
						</div>
					</div>
					{error && (
						<Alert variant="destructive">
							<AlertDescription>
								Failed to send reset link. Please try again or contact support.
							</AlertDescription>
						</Alert>
					)}
					<Button
						type="submit"
						className="w-full"
						disabled={isPending || !email}
					>
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
		</Card>
	)
}
