import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import type { UpdateProfileInput } from "shared"
import { updateProfileBodySchema } from "shared"
import {
	useChangePassword,
	useClientProfile,
	useUpdateClientProfile,
} from "@/api/hooks"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardFooter,
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
import { Label } from "@/components/ui/label"
import {
	createPasswordChangeSchema,
	type PasswordChangeSchema,
} from "@/schemas/auth"

export function AccountSettingsTab() {
	const { t } = useTranslation()
	const { data: accountData } = useClientProfile()
	const updateProfile = useUpdateClientProfile()
	const changePassword = useChangePassword()

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
									<FormLabel>{t("email")}</FormLabel>
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
									<FormLabel>{t("name")}</FormLabel>
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
									{t("copy")}
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
								},
							},
						),
					)}
				>
					<CardContent className="space-y-4 pt-4">
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
	)
}
