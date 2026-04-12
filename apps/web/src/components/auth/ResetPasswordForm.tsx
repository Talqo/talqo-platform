import { Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { PasswordInput } from "./PasswordInput"

interface ResetPasswordFormProps {
	password: string
	onPasswordChange: (password: string) => void
	onSubmit: (e: React.FormEvent) => void
	isPending: boolean
	error: string | null
}

export function ResetPasswordForm({
	password,
	onPasswordChange,
	onSubmit,
	isPending,
	error,
}: ResetPasswordFormProps) {
	return (
		<Card className="w-full max-w-sm">
			<CardHeader className="space-y-1">
				<CardTitle className="text-center text-2xl">Reset password</CardTitle>
				<CardDescription className="text-center">
					Enter your new password below.
				</CardDescription>
			</CardHeader>
			<form onSubmit={onSubmit}>
				<CardContent className="space-y-4">
					{error && (
						<Alert variant="destructive">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}
					<PasswordInput
						id="password"
						label="New password"
						value={password}
						onChange={onPasswordChange}
						placeholder="Enter new password"
						autoComplete="new-password"
						disabled={isPending}
						helpText="Must be at least 8 characters"
					/>
					<Button
						type="submit"
						className="w-full"
						disabled={isPending || password.length < 8}
					>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Resetting...
							</>
						) : (
							"Reset password"
						)}
					</Button>
				</CardContent>
			</form>
		</Card>
	)
}
