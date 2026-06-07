import { z } from "zod"
import { satisfactionRatingSchema } from "./common"

export const CLIENT_STATUS_VALUES = ["active", "suspended"] as const
export type ClientStatus = (typeof CLIENT_STATUS_VALUES)[number]

export const clientStatusUpdateSchema = z.object({
	status: z.enum(CLIENT_STATUS_VALUES),
})

export const conversationSummarySchema = z.object({
	id: z.string().uuid(),
	clientId: z.string().uuid(),
	clientName: z.string().nullable(),
	clientEmail: z.string().nullable(),
	startedAt: z.string(),
	satisfactionRating: satisfactionRatingSchema,
	messageCount: z.number().int(),
})

export type ConversationSummary = z.infer<typeof conversationSummarySchema>
