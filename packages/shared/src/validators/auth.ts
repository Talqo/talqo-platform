import { z } from "zod"

export const RegisterSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Name is required")
		.max(100, "Name must be 100 characters or less"),
	email: z.string().trim().email("Please enter a valid email address"),
	password: z
		.string()
		.min(8, "Password must be at least 8 characters")
		.max(100, "Password must be 100 characters or less"),
})

export const LoginSchema = z.object({
	email: z.string().trim().email("Please enter a valid email address"),
	password: z.string().min(1, "Password is required"),
})

export const VerifyEmailSchema = z.object({
	token: z.string().uuid("Invalid verification token format"),
})

export const ForgotPasswordSchema = z.object({
	email: z.string().trim().email("Please enter a valid email address"),
})

export const ResetPasswordSchema = z.object({
	token: z.string().uuid("Invalid reset token format"),
	password: z
		.string()
		.min(8, "Password must be at least 8 characters")
		.max(100, "Password must be 100 characters or less"),
})

export const VerifyResetTokenSchema = z.object({
	token: z.string().uuid("Invalid reset token format"),
})

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
export type VerifyResetTokenInput = z.infer<typeof VerifyResetTokenSchema>
