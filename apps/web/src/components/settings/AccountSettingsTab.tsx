import { zodResolver } from "@hookform/resolvers/zod"
import { useCallback, useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import type { UpdateProfileInput } from "shared"
import { updateProfileBodySchema } from "shared"
import {
	useChangePassword,
	useClientProfile,
	useUpdateClientProfile,
} from "@/api/hooks"
import type { ApiError } from "@/api/hooks/useAuth"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { type PasswordChangeSchema, passwordChangeSchema } from "@/schemas/auth"

type Feedback = { type: "success" | "error"; message: string }

export function AccountSettingsTab() {
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
				<CardTitle>Account Details</CardTitle>
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
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input
											type="email"
											placeholder="you@example.com"
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
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input type="text" placeholder="Your name" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className="space-y-2">
							<Label>API Key</Label>
							<div className="flex gap-2">
								<Input
									type="password"
									placeholder="••••••••••••••••"
									readOnly
									className="flex-1"
								/>
								<Button variant="outline" size="sm" type="button" disabled>
									Copy
								</Button>
								<Button variant="outline" size="sm" type="button" disabled>
									Regenerate
								</Button>
							</div>
							<p className="text-muted-foreground text-sm">
								Use this key to authenticate API requests.
							</p>
						</div>
					</CardContent>
					<CardFooter className="flex justify-end">
						<Button type="submit" disabled={updateProfile.isPending}>
							{updateProfile.isPending ? "Saving..." : "Save Profile"}
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
									<FormLabel>Current Password</FormLabel>
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
									<FormLabel>New Password</FormLabel>
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
									<FormLabel>Confirm New Password</FormLabel>
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
							{changePassword.isPending ? "Changing..." : "Change Password"}
						</Button>
					</CardFooter>
				</form>
			</Form>
		</Card>
	)
}
