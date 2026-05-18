import { zodResolver } from "@hookform/resolvers/zod"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import type { UpdateProfileInput } from "shared"
import { updateProfileBodySchema } from "shared"
import {
	useChangePassword,
	useClientProfile,
	useDeleteAccount,
	useUpdateClientProfile,
} from "@/api/hooks"
import type { ApiError } from "@/api/hooks/useAuth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	createPasswordChangeSchema,
	type DeleteAccountSchema,
	deleteAccountSchema,
	type PasswordChangeSchema,
} from "@/schemas/auth"

function DeleteAccountDialog() {
	const [open, setOpen] = useState(false)
	const deleteAccount = useDeleteAccount()
	const form = useForm<DeleteAccountSchema>({
		resolver: zodResolver(deleteAccountSchema),
		defaultValues: { password: "" },
	})

	const onSubmit = (values: DeleteAccountSchema) => {
		deleteAccount.mutate(
			{ password: values.password },
			{
				onError: () => {
					form.resetField("password")
				},
			},
		)
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) form.reset()
				setOpen(next)
			}}
		>
			<DialogTrigger asChild>
				<Button variant="destructive" size="sm">
					Delete Account
				</Button>
			</DialogTrigger>
			<DialogContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)}>
						<DialogHeader>
							<DialogTitle>Delete account permanently?</DialogTitle>
							<DialogDescription>
								This will immediately and irreversibly delete your account,
								widget, all conversations, and every other associated record.
								There is no undo.
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-2 py-2">
							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Confirm your password</FormLabel>
										<FormControl>
											<Input
												id="delete-password"
												type="password"
												placeholder="Enter your password"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							{deleteAccount.isError && (
								<p className="text-destructive text-sm">
									{deleteAccount.error?.error?.message ??
										"Incorrect password. Please try again."}
								</p>
							)}
						</div>
						<DialogFooter>
							<DialogClose asChild>
								<Button variant="outline" disabled={deleteAccount.isPending}>
									Cancel
								</Button>
							</DialogClose>
							<Button
								type="submit"
								variant="destructive"
								disabled={!form.watch("password") || deleteAccount.isPending}
							>
								{deleteAccount.isPending ? "Deleting..." : "Delete my account"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	)
}

type Feedback = { type: "success" | "error"; message: string }

export function AccountSettingsTab() {
	const { t } = useTranslation()
	const { data: accountData } = useClientProfile()
	const updateProfile = useUpdateClientProfile()
	const changePassword = useChangePassword()

	const [pwFeedback, setPwFeedback] = useState<Feedback | null>(null)
	const pwFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const schedulePwFeedbackClear = useCallback(() => {
		if (pwFeedbackTimerRef.current) clearTimeout(pwFeedbackTimerRef.current)
		pwFeedbackTimerRef.current = setTimeout(() => setPwFeedback(null), 5000)
	}, [])

	useEffect(() => {
		return () => {
			if (pwFeedbackTimerRef.current) clearTimeout(pwFeedbackTimerRef.current)
		}
	}, [])

	const profileForm = useForm<UpdateProfileInput>({
		resolver: zodResolver(updateProfileBodySchema),
		defaultValues: { email: "", name: "" },
		mode: "onBlur",
	})

	const passwordChangeSchema = useMemo(() => createPasswordChangeSchema(t), [t])

	const passwordForm = useForm<PasswordChangeSchema>({
		resolver: zodResolver(passwordChangeSchema),
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmNewPassword: "",
		},
		mode: "onBlur",
	})

	useEffect(() => {
		if (accountData) {
			profileForm.reset(
				{
					email: accountData.email ?? "",
					name: accountData.name ?? "",
				},
				{ keepDirtyValues: true },
			)
		}
	}, [accountData, profileForm])

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>{t("settings.account.title")}</CardTitle>
				</CardHeader>
				<Form {...profileForm}>
					<form
						onSubmit={profileForm.handleSubmit((values) =>
							updateProfile.mutate(values),
						)}
					>
						<CardContent className="space-y-4">
							<FormField
								control={profileForm.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("common.email")}</FormLabel>
										<FormControl>
											<Input
												type="email"
												placeholder={t("settings.account.emailPlaceholder")}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={profileForm.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("common.name")}</FormLabel>
										<FormControl>
											<Input
												type="text"
												placeholder={t("settings.account.namePlaceholder")}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<div className="space-y-2">
								<Label>{t("settings.account.apiKeyLabel")}</Label>
								<div className="flex gap-2">
									<Input
										type="password"
										placeholder={t("settings.account.apiKeyPlaceholder")}
										readOnly
										className="flex-1"
									/>
									<Button variant="outline" size="sm" type="button" disabled>
										{t("common.copy")}
									</Button>
									<Button variant="outline" size="sm" type="button" disabled>
										{t("settings.account.regenerate")}
									</Button>
								</div>
								<p className="text-muted-foreground text-sm">
									{t("settings.account.apiKeyHelp")}
								</p>
							</div>
						</CardContent>
						<CardFooter className="flex justify-end">
							<Button type="submit" disabled={updateProfile.isPending}>
								{updateProfile.isPending
									? t("settings.account.saving")
									: t("settings.account.saveProfile")}
							</Button>
						</CardFooter>
					</form>
				</Form>

				<hr className="mx-6 border-border border-t-2" />

				<Form {...passwordForm}>
					<form
						onSubmit={passwordForm.handleSubmit((values) =>
							changePassword.mutate(
								{
									currentPassword: values.currentPassword,
									newPassword: values.newPassword,
								},
								{
									onSuccess: () => {
										passwordForm.reset()
										setPwFeedback({
											type: "success",
											message: "Password changed successfully",
										})
										schedulePwFeedbackClear()
									},
									onError: (error: ApiError) => {
										const msg =
											error.error?.message ??
											"Failed to change password. Please try again."
										setPwFeedback({
											type: "error",
											message: msg,
										})
										schedulePwFeedbackClear()
									},
								},
							),
						)}
					>
						<CardContent className="space-y-4 pt-4">
							{pwFeedback && (
								<Alert
									variant={
										pwFeedback.type === "error" ? "destructive" : "default"
									}
								>
									<AlertDescription>{pwFeedback.message}</AlertDescription>
								</Alert>
							)}
							<FormField
								control={passwordForm.control}
								name="currentPassword"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("currentPassword")}</FormLabel>
										<FormControl>
											<Input type="password" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={passwordForm.control}
								name="newPassword"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("newPassword")}</FormLabel>
										<FormControl>
											<Input type="password" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={passwordForm.control}
								name="confirmNewPassword"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("confirmNewPassword")}</FormLabel>
										<FormControl>
											<Input type="password" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</CardContent>
						<CardFooter className="flex justify-end">
							<Button
								type="submit"
								variant="default"
								disabled={changePassword.isPending}
							>
								{changePassword.isPending
									? t("settings.account.changing")
									: t("settings.account.changePassword")}
							</Button>
						</CardFooter>
					</form>
				</Form>
			</Card>

			<Card className="border-destructive">
				<CardHeader>
					<CardTitle className="text-destructive">Danger Zone</CardTitle>
					<CardDescription>
						Permanently delete your account and all associated data. This action
						cannot be undone.
					</CardDescription>
				</CardHeader>
				<CardFooter>
					<DeleteAccountDialog />
				</CardFooter>
			</Card>
		</div>
	)
}
