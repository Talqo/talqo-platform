import { z } from "zod";

export const updateBotConfigBodySchema = z.object({
	systemPrompt: z.string().nullable().optional(),
	defaultRole: z.string().nullable().optional(),
	toneStyle: z.string().nullable().optional(),
	internetSearchEnabled: z.boolean().optional(),
});
