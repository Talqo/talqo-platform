import { Link } from "@tanstack/react-router"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"

type ForgotPasswordSuccessProps = {
	email: string
}

export function ForgotPasswordSuccess({ email }: ForgotPasswordSuccessProps) {
	return (
		<Card>
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<CheckCircle2 className="h-12 w-12 text-green-500" />
				</div>
				<CardTitle className="text-2xl">Check your email</CardTitle>
				<CardDescription>
					If an account exists with {email}, we&apos;ve sent a password reset
					link to your inbox.
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
	)
}
