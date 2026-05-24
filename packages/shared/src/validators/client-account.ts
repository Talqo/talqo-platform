import { z } from "zod"

export const updateProfileBodySchema = z.object({
	name: z.string().min(1).max(255).optional(),
	email: z.string().email().optional(),
})

export const changePasswordBodySchema = z.object({
	currentPassword: z.string().min(1),
	newPassword: z.string().min(8).max(100),
})

export const addFundsBodySchema = z.object({
	amount: z.number().positive().max(10000),
})

export const usageLimitBodySchema = z.object({
	limit: z.number().nonnegative().nullable(),
})

export const usageAlertBodySchema = z.object({
	thresholdUsd: z.number().nonnegative().nullable(),
})

export const billingSettingsSchema = z.object({
	monthlyLimit: z
		.number()
		.min(1, "Limit must be at least $1")
		.max(10000, "Limit cannot exceed $10,000"),
	usageAlerts: z.boolean(),
})

export const deleteAccountBodySchema = z.object({
	password: z.string().min(1),
})

export type UpdateProfileInput = z.infer<typeof updateProfileBodySchema>
export type ChangePasswordInput = z.infer<typeof changePasswordBodySchema>
export type AddFundsInput = z.infer<typeof addFundsBodySchema>
export type UsageLimitInput = z.infer<typeof usageLimitBodySchema>
export type UsageAlertInput = z.infer<typeof usageAlertBodySchema>
export type BillingSettingsInput = z.infer<typeof billingSettingsSchema>
export type DeleteAccountInput = z.infer<typeof deleteAccountBodySchema>
