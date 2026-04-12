import { Link } from "@tanstack/react-router"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"

export function ResetPasswordInvalid() {
	return (
		<Card className="w-full max-w-sm">
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<AlertCircle className="h-12 w-12 text-destructive" />
				</div>
				<CardTitle className="text-2xl">Invalid link</CardTitle>
				<CardDescription>
					This password reset link is invalid or has expired.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<Alert variant="destructive">
					<AlertDescription>
						Please request a new password reset link.
					</AlertDescription>
				</Alert>
				<Button asChild className="w-full">
					<Link to="/forgot-password">Request new link</Link>
				</Button>
			</CardContent>
		</Card>
	)
}
