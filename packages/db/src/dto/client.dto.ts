import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod"
import { aiProviderConfigs, botConfigs, clients } from "../schema/client"

export const clientSelectSchema = createSelectSchema(clients)

// Response schema: omit sensitive fields, all string columns explicitly typed for Zod v4 compatibility
export const clientResponseSchema = createSelectSchema(clients, {
	name: z.string(),
	email: z.string(),
	balanceUsd: z.string(),
	monthlyUsageLimit: z.string().nullable(),
	usageAlertThresholdUsd: z.string().nullable(),
	widgetToken: z.string(),
	status: z.string(),
	lastActive: z.string().nullable(),
	createdAt: z.string(),
	widgetSetupDismissed: z.boolean(),
}).omit({ passwordHash: true })

export const clientInsertSchema = createInsertSchema(clients).omit({
	id: true,
	widgetToken: true,
	createdAt: true,
})

export const botConfigSelectSchema = createSelectSchema(botConfigs)

export const botConfigResponseSchema = createSelectSchema(botConfigs, {
	systemPrompt: z.string().nullable(),
	defaultRole: z.string().nullable(),
	toneStyle: z.string().nullable(),
	updatedAt: z.string(),
})

// All fields optional for PATCH
export const botConfigUpdateSchema = createInsertSchema(botConfigs)
	.omit({ id: true, clientId: true, updatedAt: true })
	.partial()

export const aiProviderConfigResponseSchema = createSelectSchema(
	aiProviderConfigs,
	{
		providerType: z.enum([
			"openai",
			"openai_compatible",
			"google",
			"anthropic",
		]),
		model: z.string(),
		baseUrl: z.string().nullable(),
		updatedAt: z.string(),
	},
).omit({ apiKeyEncrypted: true })

// Add masked API key hint to the response
export const aiProviderConfigMaskedResponseSchema =
	aiProviderConfigResponseSchema.extend({
		apiKeyMasked: z.string(),
	})

export type ClientResponse = z.infer<typeof clientResponseSchema>
export type BotConfigResponse = z.infer<typeof botConfigResponseSchema>
export type BotConfigUpdate = z.infer<typeof botConfigUpdateSchema>
export type AiProviderConfigResponse = z.infer<
	typeof aiProviderConfigResponseSchema
>
export type AiProviderConfigMaskedResponse = z.infer<
	typeof aiProviderConfigMaskedResponseSchema
>
