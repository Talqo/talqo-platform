import { z } from "zod";

/**
 * Bot configuration validation schemas
 */

export const botConfigSchema = z.object({
	context: z
		.string()
		.max(4000, "Context must be less than 4000 characters")
		.optional(),
	blacklist: z.string().optional(),
});

export type BotConfigSchema = z.infer<typeof botConfigSchema>;

export const billingSettingsSchema = z.object({
	monthlyLimit: z
		.number()
		.min(1, "Limit must be at least $1")
		.max(10000, "Limit cannot exceed $10,000"),
	usageAlerts: z.boolean(),
});

export type BillingSettingsSchema = z.infer<typeof billingSettingsSchema>;
