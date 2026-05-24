import { z } from "zod"

export const botConfigFieldsSchema = z.object({
	systemPrompt: z
		.string()
		.max(4000, "System prompt must be at most 4000 characters"),
	defaultRole: z
		.string()
		.min(1, "Default role must be at least 1 character")
		.max(255, "Default role must be at most 255 characters"),
	toneStyle: z
		.string()
		.min(1, "Tone & style must be at least 1 character")
		.max(255, "Tone & style must be at most 255 characters"),
})

export const updateBotConfigBodySchema = z.object({
	systemPrompt: botConfigFieldsSchema.shape.systemPrompt.nullable().optional(),
	defaultRole: botConfigFieldsSchema.shape.defaultRole.nullable().optional(),
	toneStyle: botConfigFieldsSchema.shape.toneStyle.nullable().optional(),
})

export type BotConfigFields = z.infer<typeof botConfigFieldsSchema>
