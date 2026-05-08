import { LoginSchema, RegisterSchema } from "shared"
import { z } from "zod"

export const loginSchema = LoginSchema

export const createRegisterSchema = (t: (key: string) => string) =>
	RegisterSchema.extend({
		confirmPassword: z
			.string()
			.min(1, t("auth.register.confirmPasswordRequired")),
	}).refine((data) => data.password === data.confirmPassword, {
		message: t("auth.register.passwordsDoNotMatch"),
		path: ["confirmPassword"],
	})

export const registerSchema = createRegisterSchema(() => "")
export type RegisterFormType = z.infer<typeof registerSchema>

export const createResetPasswordFormSchema = (t: (key: string) => string) =>
	z.object({
		password: z.string().min(8, t("auth.resetPassword.passwordMinLength")),
	})

export const resetPasswordFormSchema = createResetPasswordFormSchema(() => "")
export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>

export const createPasswordChangeSchema = (t: (key: string) => string) =>
	z
		.object({
			currentPassword: z
				.string()
				.min(1, t("auth.passwordChange.currentPasswordRequired")),
			newPassword: z
				.string()
				.min(8, t("auth.passwordChange.passwordMinLength")),
			confirmNewPassword: z
				.string()
				.min(1, t("auth.passwordChange.confirmNewPasswordRequired")),
		})
		.refine((data) => data.newPassword === data.confirmNewPassword, {
			message: t("auth.passwordChange.passwordsDoNotMatch"),
			path: ["confirmNewPassword"],
		})

export const passwordChangeSchema = createPasswordChangeSchema(() => "")
export type PasswordChangeSchema = z.infer<typeof passwordChangeSchema>
