import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import { ArrowLeft, Loader2, Mail } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
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
	const { t } = useTranslation()
	const form = useForm<ForgotPasswordInput>({
		resolver: zodResolver(ForgotPasswordSchema),
		defaultValues: { email: "" },
		mode: "onBlur",
	})

	return (
		<Card>
			<CardHeader className="space-y-1">
				<CardTitle className="text-center text-2xl">
					{t("auth.forgotPassword.title")}
				</CardTitle>
				<CardDescription className="text-center">
					{t("auth.forgotPassword.description")}
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
									<FormLabel>{t("common.email")}</FormLabel>
									<FormControl>
										<div className="relative">
											<Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
											<Input
												type="email"
												placeholder={t("auth.forgotPassword.emailPlaceholder")}
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
									{t("auth.forgotPassword.error")}
								</AlertDescription>
							</Alert>
						)}
						<Button type="submit" className="w-full" disabled={isPending}>
							{isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									{t("auth.forgotPassword.sending")}
								</>
							) : (
								t("auth.forgotPassword.sendResetLink")
							)}
						</Button>
						<Button asChild variant="ghost" className="w-full">
							<Link to="/login">
								<ArrowLeft className="mr-2 h-4 w-4" />
								{t("auth.forgotPassword.backToLogin")}
							</Link>
						</Button>
					</CardContent>
				</form>
			</Form>
		</Card>
	)
}
