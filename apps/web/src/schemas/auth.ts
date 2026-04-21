import { changePasswordBodySchema, LoginSchema, RegisterSchema } from "shared"
import { z } from "zod"

export const loginSchema = LoginSchema
export type LoginFormType = z.infer<typeof loginSchema>

export const registerSchema = RegisterSchema.extend({
	confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
	message: "Passwords do not match",
	path: ["confirmPassword"],
})
export type RegisterFormType = z.infer<typeof registerSchema>

export const passwordChangeSchema = changePasswordBodySchema
	.extend({
		confirmNewPassword: z.string().min(1, "Please confirm your new password"),
	})
	.refine((data) => data.newPassword === data.confirmNewPassword, {
		message: "Passwords do not match",
		path: ["confirmNewPassword"],
	})

export type PasswordChangeSchema = z.infer<typeof passwordChangeSchema>
