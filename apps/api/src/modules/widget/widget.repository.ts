import { and, eq, gte, lt, sql, sum } from "drizzle-orm"
import { BadRequestError } from "@/common/errors"
import type { DB } from "@/db"
import {
	clients,
	conversations,
	endUserSessions,
	type messageRoleEnum,
	messages,
	usageRecords,
} from "@/db/schema"

export type WidgetMessage = {
	id: string
	conversationId: string
	role: string
	content: string
	tokenCount: number
	createdAt: Date
}

export type IWidgetRepository = {
	findOrCreateSession(
		clientId: string,
		browserSessionId: string,
	): Promise<{
		session: {
			id: string
			clientId: string
			browserSessionId: string
			createdAt: Date
			lastActiveAt: Date
		}
		isNew: boolean
	}>
	getSession(
		sessionId: string,
		clientId: string,
	): Promise<{
		id: string
		clientId: string
		browserSessionId: string
		createdAt: Date
		lastActiveAt: Date
	} | null>
	createConversation(
		sessionId: string,
		clientId: string,
	): Promise<{
		id: string
		sessionId: string
		clientId: string
		startedAt: Date
		satisfactionRating: number | null
	}>
	getConversation(
		conversationId: string,
		clientId: string,
	): Promise<{
		id: string
		sessionId: string
		clientId: string
		startedAt: Date
		satisfactionRating: number | null
	} | null>
	deleteConversation(conversationId: string, clientId: string): Promise<boolean>
	rateConversation(
		conversationId: string,
		clientId: string,
		rating: number,
	): Promise<{
		id: string
		sessionId: string
		clientId: string
		startedAt: Date
		satisfactionRating: number | null
	} | null>
	getMessages(
		conversationId: string,
		clientId: string,
	): Promise<WidgetMessage[] | null>
	getMessageCount(
		conversationId: string,
		clientId: string,
	): Promise<number | null>
	createMessage(
		conversationId: string,
		role: (typeof messageRoleEnum.enumValues)[number],
		content: string,
		tokenCount?: number,
	): Promise<WidgetMessage>
	recordUsage(
		clientId: string,
		messageId: string,
		tokensUsed: number,
		costUsd: number,
	): Promise<void>
	getMonthlySpend(
		clientId: string,
		year: number,
		month: number,
	): Promise<number>
	getClientLimitSettings(clientId: string): Promise<{
		monthlyUsageLimit: number | null
		usageAlertThresholdUsd: number | null
		email: string
	} | null>
	getClientBalance(clientId: string): Promise<number | null>
}

export class InMemoryWidgetRepository implements IWidgetRepository {
	private sessions = new Map<
		string,
		{
			id: string
			clientId: string
			browserSessionId: string
			createdAt: Date
			lastActiveAt: Date
		}
	>()
	private conversations = new Map<
		string,
		{
			id: string
			sessionId: string
			clientId: string
			startedAt: Date
			satisfactionRating: number | null
		}
	>()
	private clients = new Map<string, { balanceUsd: number }>()
	private messageList: WidgetMessage[] = []
	private usages: {
		clientId: string
		messageId: string
		tokensUsed: number
		costUsd: number
		recordedAt: Date
	}[] = []
	balanceDeductions: { clientId: string; amount: number }[] = []
	private idCounters = { session: 0, conversation: 0, message: 0 }

	async findOrCreateSession(clientId: string, browserSessionId: string) {
		for (const sess of this.sessions.values()) {
			if (
				sess.clientId === clientId &&
				sess.browserSessionId === browserSessionId
			) {
				sess.lastActiveAt = new Date()
				return { session: sess, isNew: false }
			}
		}
		this.idCounters.session++
		const id = `sess-${this.idCounters.session}`
		const sess = {
			id,
			clientId,
			browserSessionId,
			createdAt: new Date(),
			lastActiveAt: new Date(),
		}
		this.sessions.set(id, sess)
		return { session: sess, isNew: true }
	}

	async getSession(sessionId: string, clientId: string) {
		const sess = this.sessions.get(sessionId)
		return sess && sess.clientId === clientId ? sess : null
	}

	async createConversation(sessionId: string, clientId: string) {
		this.idCounters.conversation++
		const id = `conv-${this.idCounters.conversation}`
		const conv = {
			id,
			sessionId,
			clientId,
			startedAt: new Date(),
			satisfactionRating: null,
		}
		this.conversations.set(id, conv)
		return conv
	}

	async getConversation(conversationId: string, clientId: string) {
		const conv = this.conversations.get(conversationId)
		return conv && conv.clientId === clientId ? conv : null
	}

	async deleteConversation(conversationId: string, clientId: string) {
		const conv = this.conversations.get(conversationId)
		if (conv && conv.clientId === clientId) {
			this.conversations.delete(conversationId)
			return true
		}
		return false
	}

	async rateConversation(
		conversationId: string,
		clientId: string,
		rating: number,
	) {
		const conv = this.conversations.get(conversationId)
		if (!conv || conv.clientId !== clientId) return null
		conv.satisfactionRating = rating
		return conv
	}

	async getMessages(conversationId: string, clientId: string) {
		const conv = this.conversations.get(conversationId)
		if (!conv || conv.clientId !== clientId) return null
		return this.messageList.filter((m) => m.conversationId === conversationId)
	}

	async getMessageCount(conversationId: string, clientId: string) {
		const conv = this.conversations.get(conversationId)
		if (!conv || conv.clientId !== clientId) return null
		return this.messageList.filter((m) => m.conversationId === conversationId)
			.length
	}

	async createMessage(
		conversationId: string,
		role: string,
		content: string,
		tokenCount = 0,
	) {
		this.idCounters.message++
		const msg: WidgetMessage = {
			id: `msg-${this.idCounters.message}`,
			conversationId,
			role,
			content,
			tokenCount,
			createdAt: new Date(),
		}
		this.messageList.push(msg)
		return msg
	}

	async recordUsage(
		clientId: string,
		messageId: string,
		tokensUsed: number,
		costUsd: number,
	) {
		const client = this.clients.get(clientId)
		if (!client) {
			throw new BadRequestError("CLIENT_NOT_FOUND", "Client not found")
		}
		if (client.balanceUsd < costUsd) {
			throw new BadRequestError("BALANCE_INSUFFICIENT", "Insufficient balance")
		}
		client.balanceUsd -= costUsd
		this.usages.push({
			clientId,
			messageId,
			tokensUsed,
			costUsd,
			recordedAt: new Date(),
		})
		this.balanceDeductions.push({ clientId, amount: costUsd })
	}

	async getMonthlySpend(clientId: string, year: number, month: number) {
		const start = new Date(year, month - 1, 1)
		const end = new Date(year, month, 1)
		const total = this.usages
			.filter(
				(u) =>
					u.clientId === clientId &&
					u.recordedAt >= start &&
					u.recordedAt < end,
			)
			.reduce((acc, u) => acc + u.costUsd, 0)
		return total
	}

	async getClientLimitSettings(_clientId: string) {
		return null
	}

	async getClientBalance(clientId: string) {
		return this.clients.get(clientId)?.balanceUsd ?? null
	}
}

export class WidgetRepository implements IWidgetRepository {
	constructor(private readonly db: DB) {}

	// ─── Sessions ────────────────────────────────────────────────────────────────

	async findOrCreateSession(clientId: string, browserSessionId: string) {
		const now = new Date()
		const [session] = await this.db
			.insert(endUserSessions)
			.values({ clientId, browserSessionId, createdAt: now, lastActiveAt: now })
			.onConflictDoUpdate({
				target: [endUserSessions.clientId, endUserSessions.browserSessionId],
				set: { lastActiveAt: now },
			})
			.returning()
		// createdAt === lastActiveAt only when the row was just inserted
		const isNew = session.createdAt.getTime() === session.lastActiveAt.getTime()
		return { session, isNew }
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
			.then((rows) => rows[0] ?? null)
	}

	// ─── Conversations ───────────────────────────────────────────────────────────

	async createConversation(sessionId: string, clientId: string) {
		const [conversation] = await this.db
			.insert(conversations)
			.values({ sessionId, clientId })
			.returning()
		return conversation
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
			.then((rows) => rows[0] ?? null)
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
			.returning()
		return result.length > 0
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
			.returning()
		return updated ?? null
	}

	// ─── Messages ────────────────────────────────────────────────────────────────

	async getMessages(conversationId: string, clientId: string) {
		// Verify ownership via conversation lookup
		const conversation = await this.getConversation(conversationId, clientId)
		if (!conversation) return null

		return this.db
			.select()
			.from(messages)
			.where(eq(messages.conversationId, conversationId))
			.orderBy(messages.createdAt)
	}

	async getMessageCount(conversationId: string, clientId: string) {
		const conversation = await this.getConversation(conversationId, clientId)
		if (!conversation) return null
		const result = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(messages)
			.where(eq(messages.conversationId, conversationId))
			.then((rows) => rows[0]?.count ?? 0)
		return result
	}

	async createMessage(
		conversationId: string,
		role: (typeof messageRoleEnum.enumValues)[number],
		content: string,
		tokenCount = 0,
	) {
		const [message] = await this.db
			.insert(messages)
			.values({ conversationId, role, content, tokenCount })
			.returning()
		return message
	}

	async recordUsage(
		clientId: string,
		messageId: string,
		tokensUsed: number,
		costUsd: number,
	) {
		await this.db.transaction(async (tx) => {
			const [client] = await tx
				.select({ id: clients.id })
				.from(clients)
				.where(eq(clients.id, clientId))
			if (!client) {
				throw new BadRequestError("CLIENT_NOT_FOUND", "Client not found")
			}
			await tx
				.insert(usageRecords)
				.values({ clientId, messageId, tokensUsed, costUsd })
			const updated = await tx
				.update(clients)
				.set({
					balanceUsd: sql`${clients.balanceUsd} - ${costUsd}`,
				})
				.where(
					and(
						eq(clients.id, clientId),
						sql`${clients.balanceUsd} >= ${costUsd}`,
					),
				)
				.returning({ id: clients.id })
			if (updated.length === 0) {
				throw new BadRequestError(
					"BALANCE_INSUFFICIENT",
					"Insufficient balance",
				)
			}
		})
	}

	async getMonthlySpend(clientId: string, year: number, month: number) {
		const start = new Date(year, month - 1, 1)
		const end = new Date(year, month, 1)
		const [row] = await this.db
			.select({ total: sum(usageRecords.costUsd) })
			.from(usageRecords)
			.where(
				and(
					eq(usageRecords.clientId, clientId),
					gte(usageRecords.recordedAt, start),
					lt(usageRecords.recordedAt, end),
				),
			)
		return Number(row?.total ?? 0) // sum() always returns string | null
	}

	async getClientLimitSettings(clientId: string) {
		return this.db
			.select({
				monthlyUsageLimit: clients.monthlyUsageLimit,
				usageAlertThresholdUsd: clients.usageAlertThresholdUsd,
				email: clients.email,
			})
			.from(clients)
			.where(eq(clients.id, clientId))
			.then((rows) => rows[0] ?? null)
	}

	async getClientBalance(clientId: string) {
		return this.db
			.select({ balanceUsd: clients.balanceUsd })
			.from(clients)
			.where(eq(clients.id, clientId))
			.then((rows) => rows[0]?.balanceUsd ?? null)
	}
}
