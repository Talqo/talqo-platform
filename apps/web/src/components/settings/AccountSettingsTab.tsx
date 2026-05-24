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
	useRotateWidgetToken,
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
	createPasswordChangeSchema,
	type DeleteAccountSchema,
	deleteAccountSchema,
	type PasswordChangeSchema,
} from "@/schemas/auth"

function DeleteAccountDialog() {
	const { t } = useTranslation()
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
					{t("settings.account.deleteAccount")}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)}>
						<DialogHeader>
							<DialogTitle>
								{t("settings.account.deleteAccountTitle")}
							</DialogTitle>
							<DialogDescription>
								{t("settings.account.deleteAccountDescription")}
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-2 py-2">
							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("settings.account.confirmPassword")}
										</FormLabel>
										<FormControl>
											<Input
												id="delete-password"
												type="password"
												placeholder={t("settings.account.passwordPlaceholder")}
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
										t("settings.account.deleteAccountError")}
								</p>
							)}
						</div>
						<DialogFooter>
							<DialogClose asChild>
								<Button variant="outline" disabled={deleteAccount.isPending}>
									{t("common.cancel")}
								</Button>
							</DialogClose>
							<Button
								type="submit"
								variant="destructive"
								disabled={!form.watch("password") || deleteAccount.isPending}
							>
								{deleteAccount.isPending
									? t("settings.account.deleting")
									: t("settings.account.deleteMyAccount")}
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
	const rotateWidgetToken = useRotateWidgetToken()

	const [pwFeedback, setPwFeedback] = useState<Feedback | null>(null)
	const [rotateConfirmOpen, setRotateConfirmOpen] = useState(false)
	const [tokenCopied, setTokenCopied] = useState(false)
	const [tokenCopyFailed, setTokenCopyFailed] = useState(false)

	const handleCopyWidgetToken = useCallback(async () => {
		if (accountData?.widgetToken) {
			try {
				await navigator.clipboard.writeText(accountData.widgetToken)
				setTokenCopied(true)
				setTimeout(() => setTokenCopied(false), 1500)
			} catch {
				setTokenCopyFailed(true)
				setTimeout(() => setTokenCopyFailed(false), 1500)
			}
		}
	}, [accountData?.widgetToken])

	const handleRotateConfirmed = useCallback(() => {
		rotateWidgetToken.mutate(undefined, {
			onSuccess: () => setRotateConfirmOpen(false),
		})
	}, [rotateWidgetToken])
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
							{updateProfile.isError && (
								<p className="px-6 pb-2 text-destructive text-sm">
									{t("settings.account.profileSaveFailed")}
								</p>
							)}
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
											message: t("settings.account.passwordChangedSuccess"),
										})
										schedulePwFeedbackClear()
									},
									onError: (error: ApiError) => {
										const msg =
											error.error?.message ??
											t("settings.account.passwordChangeFailed")
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

			<Card>
				<CardHeader>
					<CardTitle>{t("settings.account.widgetTokenLabel")}</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex gap-2">
						<Input
							type="text"
							value={accountData?.widgetToken ?? ""}
							readOnly
							className="flex-1 font-mono text-sm"
							aria-label={t("settings.account.widgetTokenLabel")}
						/>
						<Button
							variant={tokenCopyFailed ? "destructive" : "outline"}
							size="sm"
							type="button"
							onClick={handleCopyWidgetToken}
							disabled={!accountData?.widgetToken}
						>
							{tokenCopied
								? t("common.copied")
								: tokenCopyFailed
									? t("common.failed")
									: t("common.copy")}
						</Button>
						<Button
							variant="outline"
							size="sm"
							type="button"
							disabled={!accountData?.widgetToken}
							onClick={() => setRotateConfirmOpen(true)}
						>
							{t("settings.account.regenerate")}
						</Button>
						<ConfirmDialog
							open={rotateConfirmOpen}
							onOpenChange={(next) => {
								if (!next) rotateWidgetToken.reset()
								setRotateConfirmOpen(next)
							}}
							title={t("settings.account.regenerate")}
							description={t("settings.account.widgetTokenHelp")}
							confirmLabel={t("settings.account.regenerate")}
							cancelLabel={t("common.cancel")}
							variant="destructive"
							onConfirm={handleRotateConfirmed}
							confirmLoading={rotateWidgetToken.isPending}
							error={
								rotateWidgetToken.isError
									? t("settings.account.rotateFailed")
									: null
							}
						/>
					</div>
				</CardContent>
			</Card>

			<Card className="border-destructive">
				<CardHeader>
					<CardTitle className="text-destructive">
						{t("settings.account.dangerZoneTitle")}
					</CardTitle>
					<CardDescription>
						{t("settings.account.dangerZoneDescription")}
					</CardDescription>
				</CardHeader>
				<CardFooter>
					<DeleteAccountDialog />
				</CardFooter>
			</Card>
		</div>
	)
}
