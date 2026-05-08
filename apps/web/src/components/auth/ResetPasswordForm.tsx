import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
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
	createResetPasswordFormSchema,
	type ResetPasswordFormValues,
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
	const { t } = useTranslation()
	const resetPasswordFormSchema = useMemo(
		() => createResetPasswordFormSchema(t),
		[t],
	)
	const form = useForm<ResetPasswordFormValues>({
		resolver: zodResolver(resetPasswordFormSchema),
		defaultValues: { password: "" },
		mode: "onBlur",
	})

	return (
		<Card className="w-full max-w-sm">
			<CardHeader className="space-y-1">
				<CardTitle className="text-center text-2xl">
					{t("auth.resetPassword.title")}
				</CardTitle>
				<CardDescription className="text-center">
					{t("auth.resetPassword.description")}
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
									<FormLabel>{t("auth.resetPassword.newPassword")}</FormLabel>
									<FormControl>
										<PasswordInput
											value={field.value}
											onChange={field.onChange}
											onBlur={field.onBlur}
											placeholder={t("auth.resetPassword.placeholder")}
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
									{t("auth.resetPassword.submitting")}
								</>
							) : (
								t("auth.resetPassword.title")
							)}
						</Button>
					</CardContent>
				</form>
			</Form>
		</Card>
	)
}
