import { count, desc, eq } from "drizzle-orm"
import type { DB } from "@/db"
import { conversations, messages } from "@/db/schema"

export class ClientConversationRepository {
	constructor(private readonly db: DB) {}

	async listConversations({
		clientId,
		limit,
		offset,
	}: {
		clientId: string
		limit: number
		offset: number
	}) {
		return this.db
			.select({
				id: conversations.id,
				startedAt: conversations.startedAt,
				satisfactionRating: conversations.satisfactionRating,
				messageCount: count(messages.id),
			})
			.from(conversations)
			.leftJoin(messages, eq(messages.conversationId, conversations.id))
			.where(eq(conversations.clientId, clientId))
			.groupBy(
				conversations.id,
				conversations.startedAt,
				conversations.satisfactionRating,
			)
			.orderBy(desc(conversations.startedAt))
			.limit(limit)
			.offset(offset)
	}

	async getConversationWithMessages(conversationId: string, clientId: string) {
		const row = await this.db
			.select({
				id: conversations.id,
				clientId: conversations.clientId,
				startedAt: conversations.startedAt,
				satisfactionRating: conversations.satisfactionRating,
			})
			.from(conversations)
			.where(eq(conversations.id, conversationId))
			.then((rows) => rows.at(0) ?? null)

		// Ownership check — null means not found or belongs to a different client
		if (!row || row.clientId !== clientId) return null

		const msgs = await this.db
			.select()
			.from(messages)
			.where(eq(messages.conversationId, conversationId))
			.orderBy(messages.createdAt)

		return {
			id: row.id,
			startedAt: row.startedAt,
			satisfactionRating: row.satisfactionRating,
			messages: msgs,
		}
	}
}
