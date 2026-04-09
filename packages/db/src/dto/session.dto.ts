import { createSelectSchema } from "drizzle-zod"
import { z } from "zod"
import { conversations, endUserSessions, messages } from "../schema/session"

export const sessionResponseSchema = createSelectSchema(endUserSessions, {
	browserSessionId: z.string(),
	createdAt: z.string(),
	lastActiveAt: z.string(),
})

export const conversationResponseSchema = createSelectSchema(conversations, {
	startedAt: z.string(),
	satisfactionRating: z.number().int().min(1).max(5).nullable(),
})

export const messageResponseSchema = createSelectSchema(messages, {
	content: z.string(),
	createdAt: z.string(),
})

export type SessionResponse = z.infer<typeof sessionResponseSchema>
export type ConversationResponse = z.infer<typeof conversationResponseSchema>
export type MessageResponse = z.infer<typeof messageResponseSchema>
