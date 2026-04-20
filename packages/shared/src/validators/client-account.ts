import { z } from "zod"

export const updateProfileBodySchema = z.object({
	name: z.string().min(1).max(255).optional(),
	email: z.string().email().optional(),
})

export const changePasswordBodySchema = z.object({
	currentPassword: z.string().min(1),
	newPassword: z.string().min(8),
})

export const addFundsBodySchema = z.object({
	amount: z.number().positive(),
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

export type BillingSettingsInput = z.infer<typeof billingSettingsSchema>
