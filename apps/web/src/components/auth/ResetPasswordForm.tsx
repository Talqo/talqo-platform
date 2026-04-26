import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
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
import {
	type ResetPasswordFormValues,
	resetPasswordFormSchema,
} from "@/schemas/auth"
import { PasswordInput } from "./PasswordInput"

type ResetPasswordFormProps = {
	onSubmit: (password: string) => void
	isPending: boolean
	error: string | null
}

export function ResetPasswordForm({
	onSubmit,
	isPending,
	error,
}: ResetPasswordFormProps) {
	const form = useForm<ResetPasswordFormValues>({
		resolver: zodResolver(resetPasswordFormSchema),
		defaultValues: { password: "" },
		mode: "onBlur",
	})

	return (
		<Card className="w-full max-w-sm">
			<CardHeader className="space-y-1">
				<CardTitle className="text-center text-2xl">Reset password</CardTitle>
				<CardDescription className="text-center">
					Enter your new password below.
				</CardDescription>
			</CardHeader>
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit((values) => onSubmit(values.password))}
					noValidate
				>
					<CardContent className="space-y-4">
						{error && (
							<Alert variant="destructive">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}
						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem>
									<FormLabel>New password</FormLabel>
									<FormControl>
										<PasswordInput
											value={field.value}
											onChange={field.onChange}
											onBlur={field.onBlur}
											placeholder="Enter new password"
											autoComplete="new-password"
											disabled={isPending}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button type="submit" className="w-full" disabled={isPending}>
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
			</Form>
		</Card>
	)
}
