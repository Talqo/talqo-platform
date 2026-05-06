import { z } from "zod"

export const clientConversationSummarySchema = z.object({
	id: z.string().uuid(),
	startedAt: z.string(),
	satisfactionRating: z.number().int().min(1).max(5).nullable(),
	messageCount: z.number().int(),
})

export type ClientConversationSummary = z.infer<
	typeof clientConversationSummarySchema
>
