import { Loader2 } from "lucide-react"
import { useState } from "react"
import {
	useChangePassword,
	useClientProfile,
} from "@/api/hooks/useClientAccount"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useForm } from "@/lib/useForm"
import { passwordChangeSchema } from "@/schemas"

type PasswordFormData = Record<string, string> & {
	currentPassword: string
	newPassword: string
	confirmNewPassword: string
}

const validatePasswordForm = (values: PasswordFormData) => {
	const result = passwordChangeSchema.safeParse(values)
	if (result.success) return {}
	const errors: Partial<Record<keyof PasswordFormData, string>> = {}
	for (const issue of result.error.issues) {
		const path = issue.path[0] as keyof PasswordFormData
		errors[path] = issue.message
	}
	return errors
}

export function AccountSettingsTab() {
	const { data: profile, isLoading } = useClientProfile()
	const { mutate: changePassword, isPending } = useChangePassword()
	const [successMessage, setSuccessMessage] = useState<string | null>(null)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	const {
		values,
		errors,
		touched,
		handleChange,
		handleBlur,
		handleSubmit,
		reset,
	} = useForm<PasswordFormData>({
		initialValues: {
			currentPassword: "",
			newPassword: "",
			confirmNewPassword: "",
		},
		validate: validatePasswordForm,
		onSubmit: async () => {
			setSuccessMessage(null)
			setErrorMessage(null)
			changePassword(
				{
					currentPassword: values.currentPassword,
					newPassword: values.newPassword,
				},
				{
					onSuccess: () => {
						setSuccessMessage("Password changed successfully.")
						reset()
					},
					onError: (err) => {
						setErrorMessage(
							err.error?.message ??
								"Failed to change password. Please try again.",
						)
					},
				},
			)
		},
	})

	return (
		<Card>
			<CardHeader>
				<CardTitle>Account Details</CardTitle>
			</CardHeader>
			<form onSubmit={handleSubmit} noValidate>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="account-email">Email</Label>
						{isLoading ? (
							<Skeleton className="h-10 w-full" />
						) : (
							<Input id="account-email" value={profile?.email ?? ""} readOnly />
						)}
					</div>
					<div className="space-y-2">
						<Label htmlFor="account-api-key">API Key</Label>
						<div className="flex gap-2">
							<Input
								id="account-api-key"
								type="password"
								placeholder="••••••••••••••••"
								readOnly
								className="flex-1"
							/>
							<Button variant="outline" size="sm">
								Copy
							</Button>
							<Button variant="outline" size="sm">
								Regenerate
							</Button>
						</div>
						<p className="text-muted-foreground text-sm">
							Use this key to authenticate API requests.
						</p>
					</div>
					<hr className="my-4 border-border border-t-2" />
					{successMessage && (
						<Alert>
							<AlertDescription>{successMessage}</AlertDescription>
						</Alert>
					)}
					{errorMessage && (
						<Alert variant="destructive">
							<AlertDescription>{errorMessage}</AlertDescription>
						</Alert>
					)}
					<div className="space-y-2">
						<Label htmlFor="current-password">Current Password</Label>
						<Input
							id="current-password"
							type="password"
							value={values.currentPassword}
							onChange={(e) => handleChange("currentPassword")(e.target.value)}
							onBlur={handleBlur("currentPassword")}
						/>
						{touched.currentPassword && errors.currentPassword && (
							<p className="text-destructive text-sm">
								{errors.currentPassword}
							</p>
						)}
					</div>
					<div className="space-y-2">
						<Label htmlFor="new-password">New Password</Label>
						<Input
							id="new-password"
							type="password"
							value={values.newPassword}
							onChange={(e) => handleChange("newPassword")(e.target.value)}
							onBlur={handleBlur("newPassword")}
						/>
						{touched.newPassword && errors.newPassword && (
							<p className="text-destructive text-sm">{errors.newPassword}</p>
						)}
					</div>
					<div className="space-y-2">
						<Label htmlFor="confirm-password">Confirm New Password</Label>
						<Input
							id="confirm-password"
							type="password"
							value={values.confirmNewPassword}
							onChange={(e) =>
								handleChange("confirmNewPassword")(e.target.value)
							}
							onBlur={handleBlur("confirmNewPassword")}
						/>
						{touched.confirmNewPassword && errors.confirmNewPassword && (
							<p className="text-destructive text-sm">
								{errors.confirmNewPassword}
							</p>
						)}
					</div>
				</CardContent>
				<CardFooter className="flex justify-end">
					<Button variant="default" type="submit" disabled={isPending}>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Changing...
							</>
						) : (
							"Change Password"
						)}
					</Button>
				</CardFooter>
			</form>
		</Card>
	)
}
