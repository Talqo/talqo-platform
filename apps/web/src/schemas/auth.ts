import { z } from "zod"
import { LoginSchema, RegisterSchema } from "shared"

/**
 * Authentication form validation schemas
 * Extends shared validators with frontend-specific fields (confirmPassword)
 */

// Re-export shared login schema
export const loginSchema = LoginSchema
export type LoginFormType = z.infer<typeof loginSchema>

// Extend shared register schema with confirmPassword
export const registerSchema = RegisterSchema.extend({
	confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
	message: "Passwords do not match",
	path: ["confirmPassword"],
})
export type RegisterFormType = z.infer<typeof registerSchema>

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
