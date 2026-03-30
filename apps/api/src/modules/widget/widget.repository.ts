import { and, eq } from "drizzle-orm";
import type { DB } from "../../db";
import {
	conversations,
	endUserSessions,
	messages,
	usageRecords,
} from "../../db/schema";

export class WidgetRepository {
	constructor(private readonly db: DB) {}

	// ─── Sessions ────────────────────────────────────────────────────────────────

	async findOrCreateSession(clientId: string, browserSessionId: string) {
		const existing = await this.db
			.select()
			.from(endUserSessions)
			.where(
				and(
					eq(endUserSessions.clientId, clientId),
					eq(endUserSessions.browserSessionId, browserSessionId),
				),
			)
			.then((rows) => rows[0] ?? null);

		if (existing) {
			const [updated] = await this.db
				.update(endUserSessions)
				.set({ lastActiveAt: new Date() })
				.where(eq(endUserSessions.id, existing.id))
				.returning();
			return updated;
		}

		const [session] = await this.db
			.insert(endUserSessions)
			.values({ clientId, browserSessionId })
			.returning();
		return session;
	}

	async getSession(sessionId: string, clientId: string) {
		return this.db
			.select()
			.from(endUserSessions)
			.where(
				and(
					eq(endUserSessions.id, sessionId),
					eq(endUserSessions.clientId, clientId),
				),
			)
			.then((rows) => rows[0] ?? null);
	}

	// ─── Conversations ───────────────────────────────────────────────────────────

	async createConversation(sessionId: string, clientId: string) {
		const [conversation] = await this.db
			.insert(conversations)
			.values({ sessionId, clientId })
			.returning();
		return conversation;
	}

	async getConversation(conversationId: string, clientId: string) {
		return this.db
			.select()
			.from(conversations)
			.where(
				and(
					eq(conversations.id, conversationId),
					eq(conversations.clientId, clientId),
				),
			)
			.then((rows) => rows[0] ?? null);
	}

	async deleteConversation(conversationId: string, clientId: string) {
		const result = await this.db
			.delete(conversations)
			.where(
				and(
					eq(conversations.id, conversationId),
					eq(conversations.clientId, clientId),
				),
			)
			.returning();
		return result.length > 0;
	}

	async rateConversation(
		conversationId: string,
		clientId: string,
		rating: number,
	) {
		const [updated] = await this.db
			.update(conversations)
			.set({ satisfactionRating: rating })
			.where(
				and(
					eq(conversations.id, conversationId),
					eq(conversations.clientId, clientId),
				),
			)
			.returning();
		return updated ?? null;
	}

	// ─── Messages ────────────────────────────────────────────────────────────────

	async getMessages(conversationId: string, clientId: string) {
		// Verify ownership via conversation lookup
		const conversation = await this.getConversation(conversationId, clientId);
		if (!conversation) return null;

		return this.db
			.select()
			.from(messages)
			.where(eq(messages.conversationId, conversationId))
			.orderBy(messages.createdAt);
	}

	async createMessage(
		conversationId: string,
		role: string,
		content: string,
		tokenCount = 0,
	) {
		const [message] = await this.db
			.insert(messages)
			.values({ conversationId, role, content, tokenCount })
			.returning();
		return message;
	}

	async recordUsage(clientId: string, tokensUsed: number, costUsd: string) {
		await this.db
			.insert(usageRecords)
			.values({ clientId, tokensUsed, costUsd });
	}
}
