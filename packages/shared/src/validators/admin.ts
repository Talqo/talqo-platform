import { z } from "zod"

export const clientStatusUpdateSchema = z.object({
	status: z.enum(["active", "suspended"]),
})

export const conversationSummarySchema = z.object({
	id: z.string().uuid(),
	clientId: z.string().uuid(),
	clientName: z.string().nullable(),
	clientEmail: z.string().nullable(),
	startedAt: z.string(),
	satisfactionRating: z.number().int().min(1).max(5).nullable(),
	messageCount: z.number().int(),
})

export type ConversationSummary = z.infer<typeof conversationSummarySchema>
