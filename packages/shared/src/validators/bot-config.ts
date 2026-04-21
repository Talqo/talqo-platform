import { z } from "zod"

export const botConfigFieldsSchema = z.object({
	systemPrompt: z
		.string()
		.max(4000, "System prompt must be at most 4000 characters"),
	defaultRole: z
		.string()
		.max(200, "Default role must be at most 200 characters"),
	toneStyle: z.string().max(200, "Tone & style must be at most 200 characters"),
	internetSearchEnabled: z.boolean(),
})

export const updateBotConfigBodySchema = z.object({
	systemPrompt: botConfigFieldsSchema.shape.systemPrompt.nullable().optional(),
	defaultRole: botConfigFieldsSchema.shape.defaultRole.nullable().optional(),
	toneStyle: botConfigFieldsSchema.shape.toneStyle.nullable().optional(),
	internetSearchEnabled:
		botConfigFieldsSchema.shape.internetSearchEnabled.optional(),
})

export type BotConfigFields = z.infer<typeof botConfigFieldsSchema>
