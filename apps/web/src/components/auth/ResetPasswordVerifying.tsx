import { Loader2 } from "lucide-react"
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"

export function ResetPasswordVerifying() {
	return (
		<Card className="w-full max-w-sm">
			<CardHeader className="text-center">
				<div className="mb-4 flex justify-center">
					<Loader2 className="h-12 w-12 animate-spin text-primary" />
				</div>
				<CardTitle className="text-2xl">Verifying link...</CardTitle>
				<CardDescription>
					Please wait while we verify your reset link.
				</CardDescription>
			</CardHeader>
		</Card>
	)
}
