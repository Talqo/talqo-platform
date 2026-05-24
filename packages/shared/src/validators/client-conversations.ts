import { z } from "zod"
import { satisfactionRatingSchema } from "./common"

export const clientConversationSummarySchema = z.object({
	id: z.string().uuid(),
	startedAt: z.string(),
	satisfactionRating: satisfactionRatingSchema,
	messageCount: z.number().int(),
})

export type ClientConversationSummary = z.infer<
	typeof clientConversationSummarySchema
>
