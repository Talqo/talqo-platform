import { z } from "zod"

/**
 * Bot configuration validation schemas
 */

export const botConfigSchema = z.object({
	systemPrompt: z
		.string()
		.max(4000, "System prompt must be less than 4000 characters"),
	defaultRole: z
		.string()
		.max(200, "Default role must be less than 200 characters"),
	toneStyle: z
		.string()
		.max(200, "Tone & style must be less than 200 characters"),
	internetSearchEnabled: z.boolean(),
})

export type BotConfigSchema = z.infer<typeof botConfigSchema>

export const billingSettingsSchema = z.object({
	monthlyLimit: z
		.number()
		.min(1, "Limit must be at least $1")
		.max(10000, "Limit cannot exceed $10,000"),
	usageAlerts: z.boolean(),
})

export type BillingSettingsSchema = z.infer<typeof billingSettingsSchema>
