import { Link } from "@tanstack/react-router"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"

export function ResetPasswordSuccess() {
	return (
		<Card className="w-full max-w-sm">
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<CheckCircle2 className="h-12 w-12 text-green-500" />
				</div>
				<CardTitle className="text-2xl">Password reset!</CardTitle>
				<CardDescription>
					Your password has been reset successfully. Redirecting to login...
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Button asChild className="w-full">
					<Link to="/login">Go to login</Link>
				</Button>
			</CardContent>
		</Card>
	)
}
