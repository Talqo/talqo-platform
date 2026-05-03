import { LoginSchema, RegisterSchema } from "shared"
import { z } from "zod"

export const loginSchema = LoginSchema

export const registerSchema = RegisterSchema.extend({
	confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
	message: "Passwords do not match",
	path: ["confirmPassword"],
})
export type RegisterFormType = z.infer<typeof registerSchema>

export const resetPasswordFormSchema = z.object({
	password: z.string().min(8, "Must be at least 8 characters"),
})

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>

export const passwordChangeSchema = z
	.object({
		currentPassword: z.string().min(1, "Current password is required"),
		newPassword: z.string().min(8, "Password must be at least 8 characters"),
		confirmNewPassword: z.string().min(1, "Please confirm your new password"),
	})
	.refine((data) => data.newPassword === data.confirmNewPassword, {
		message: "Passwords do not match",
		path: ["confirmNewPassword"],
	})

export type PasswordChangeSchema = z.infer<typeof passwordChangeSchema>

export const deleteAccountSchema = z.object({
	password: z.string().min(1, "Password is required"),
})

export type DeleteAccountSchema = z.infer<typeof deleteAccountSchema>
