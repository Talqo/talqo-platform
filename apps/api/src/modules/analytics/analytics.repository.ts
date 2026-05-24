import {
	and,
	avg,
	count,
	countDistinct,
	eq,
	gte,
	lte,
	sql,
	sum,
} from "drizzle-orm"
import type { DB } from "@/db"
import {
	clients,
	conversations,
	endUserSessions,
	messages,
	usageRecords,
} from "@/db/schema"

const granularityLiteral = {
	day: sql`'day'`,
	week: sql`'week'`,
	month: sql`'month'`,
} as const

export type Granularity = "day" | "week" | "month"

type TokenUsageRow = {
	period: string
	tokensUsed: number
	costUsd: string | null
}

type MessageCountRow = { period: string; messageCount: number }

type ConversationCountRow = { period: string; conversationCount: number }

type ClientSummaryResult = {
	totalConversations: number
	uniqueUsers: number
	avgSatisfactionRating: number | null
	totalUserMessages: number
	totalTokens: number
	totalPageviewSessions: number
}

type PlatformStatsResult = {
	totalTokens: number
	totalCostUsd: string | null
	activeClients: number
	totalConversations: number
}

export type AnalyticsRepository = {
	getTokenUsage(
		clientId: string,
		from: Date,
		to: Date,
		granularity: Granularity,
	): Promise<TokenUsageRow[]>
	getMessageCounts(
		clientId: string,
		from: Date,
		to: Date,
		granularity: Granularity,
	): Promise<MessageCountRow[]>
	getClientSummary(clientId: string): Promise<ClientSummaryResult>
	getPlatformStats(): Promise<PlatformStatsResult>
	getActiveTenantCount(days: number): Promise<number>
	getPlatformTokenUsageOverTime(
		from: Date,
		to: Date,
		granularity: Granularity,
	): Promise<TokenUsageRow[]>
	getPlatformConversationCountsOverTime(
		from: Date,
		to: Date,
		granularity: Granularity,
	): Promise<ConversationCountRow[]>
	getAvgPlatformSatisfaction(): Promise<number>
}

export class DrizzleAnalyticsRepository implements AnalyticsRepository {
	constructor(private readonly db: DB) {}

	async getTokenUsage(
		clientId: string,
		from: Date,
		to: Date,
		granularity: Granularity,
	) {
		const bucket = sql<string>`date_trunc(${granularityLiteral[granularity]}, ${usageRecords.recordedAt})`
		return this.db
			.select({
				period: bucket,
				tokensUsed: sum(usageRecords.tokensUsed).mapWith(Number),
				costUsd: sum(usageRecords.costUsd),
			})
			.from(usageRecords)
			.where(
				and(
					eq(usageRecords.clientId, clientId),
					gte(usageRecords.recordedAt, from),
					lte(usageRecords.recordedAt, to),
				),
			)
			.groupBy(bucket)
			.orderBy(bucket)
	}

	async getMessageCounts(
		clientId: string,
		from: Date,
		to: Date,
		granularity: Granularity,
	) {
		const bucket = sql<string>`date_trunc(${granularityLiteral[granularity]}, ${messages.createdAt})`
		return this.db
			.select({
				period: bucket,
				messageCount: count(messages.id),
			})
			.from(messages)
			.innerJoin(conversations, eq(messages.conversationId, conversations.id))
			.where(
				and(
					eq(conversations.clientId, clientId),
					eq(messages.role, "user"),
					gte(messages.createdAt, from),
					lte(messages.createdAt, to),
				),
			)
			.groupBy(bucket)
			.orderBy(bucket)
	}

	async getClientSummary(clientId: string) {
		const [convRow] = await this.db
			.select({
				totalConversations: count(conversations.id),
				avgSatisfactionRating: avg(conversations.satisfactionRating).mapWith(
					Number,
				),
			})
			.from(conversations)
			.where(eq(conversations.clientId, clientId))

		const [engagedRow] = await this.db
			.select({ uniqueUsers: countDistinct(endUserSessions.id) })
			.from(endUserSessions)
			.innerJoin(
				conversations,
				and(
					eq(conversations.sessionId, endUserSessions.id),
					eq(conversations.clientId, clientId),
				),
			)
			.where(eq(endUserSessions.clientId, clientId))

		const [msgRow] = await this.db
			.select({ totalUserMessages: count(messages.id) })
			.from(messages)
			.innerJoin(conversations, eq(messages.conversationId, conversations.id))
			.where(
				and(eq(conversations.clientId, clientId), eq(messages.role, "user")),
			)

		const [tokenRow] = await this.db
			.select({ totalTokens: sum(usageRecords.tokensUsed).mapWith(Number) })
			.from(usageRecords)
			.where(eq(usageRecords.clientId, clientId))

		const [pageviewRow] = await this.db
			.select({ totalPageviewSessions: count(endUserSessions.id) })
			.from(endUserSessions)
			.where(eq(endUserSessions.clientId, clientId))

		return {
			totalConversations: convRow?.totalConversations ?? 0,
			uniqueUsers: engagedRow?.uniqueUsers ?? 0,
			avgSatisfactionRating: convRow?.avgSatisfactionRating ?? null,
			totalUserMessages: msgRow?.totalUserMessages ?? 0,
			totalTokens: tokenRow?.totalTokens ?? 0,
			totalPageviewSessions: pageviewRow?.totalPageviewSessions ?? 0,
		}
	}

	async getPlatformStats() {
		const [tokenStats] = await this.db
			.select({
				totalTokens: sum(usageRecords.tokensUsed).mapWith(Number),
				totalCostUsd: sum(usageRecords.costUsd),
			})
			.from(usageRecords)

		const [clientStats] = await this.db
			.select({
				activeClients: countDistinct(clients.id),
			})
			.from(clients)
			.where(eq(clients.status, "active"))

		const [convStats] = await this.db
			.select({ totalConversations: count(conversations.id) })
			.from(conversations)

		return {
			totalTokens: tokenStats?.totalTokens ?? 0,
			totalCostUsd: tokenStats?.totalCostUsd ?? "0",
			activeClients: clientStats?.activeClients ?? 0,
			totalConversations: convStats?.totalConversations ?? 0,
		}
	}

	async getActiveTenantCount(days: number) {
		const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
		const [row] = await this.db
			.select({ count: countDistinct(conversations.clientId) })
			.from(conversations)
			.where(gte(conversations.startedAt, cutoff))
		return row?.count ?? 0
	}

	async getPlatformTokenUsageOverTime(
		from: Date,
		to: Date,
		granularity: Granularity,
	) {
		const bucket = sql<string>`date_trunc(${granularityLiteral[granularity]}, ${usageRecords.recordedAt})`
		return this.db
			.select({
				period: bucket,
				tokensUsed: sum(usageRecords.tokensUsed).mapWith(Number),
				costUsd: sum(usageRecords.costUsd),
			})
			.from(usageRecords)
			.where(
				and(
					gte(usageRecords.recordedAt, from),
					lte(usageRecords.recordedAt, to),
				),
			)
			.groupBy(bucket)
			.orderBy(bucket)
	}

	async getPlatformConversationCountsOverTime(
		from: Date,
		to: Date,
		granularity: Granularity,
	) {
		const bucket = sql<string>`date_trunc(${granularityLiteral[granularity]}, ${conversations.startedAt})`
		return this.db
			.select({
				period: bucket,
				conversationCount: count(conversations.id),
			})
			.from(conversations)
			.where(
				and(
					gte(conversations.startedAt, from),
					lte(conversations.startedAt, to),
				),
			)
			.groupBy(bucket)
			.orderBy(bucket)
	}

	async getAvgPlatformSatisfaction() {
		const [row] = await this.db
			.select({
				avgRating: avg(conversations.satisfactionRating).mapWith(Number),
			})
			.from(conversations)
		return row?.avgRating ?? 0
	}
}

export class InMemoryAnalyticsRepository implements AnalyticsRepository {
	tokenUsage: TokenUsageRow[] = []
	messageCounts: MessageCountRow[] = []
	clientSummary: ClientSummaryResult = {
		totalConversations: 0,
		uniqueUsers: 0,
		avgSatisfactionRating: 0,
		totalUserMessages: 0,
		totalTokens: 0,
		totalPageviewSessions: 0,
	}
	platformStats: PlatformStatsResult = {
		totalTokens: 0,
		totalCostUsd: "0",
		activeClients: 0,
		totalConversations: 0,
	}
	activeTenantCount = 0
	platformTokenUsage: TokenUsageRow[] = []
	platformConversationCounts: { period: string; conversationCount: number }[] =
		[]
	avgPlatformSatisfaction = 0

	lastTokenUsageArgs?: {
		clientId: string
		from: Date
		to: Date
		granularity: string
	}
	lastMessageCountArgs?: {
		clientId: string
		from: Date
		to: Date
		granularity: string
	}
	lastClientSummaryClientId?: string
	lastPlatformTokenUsageArgs?: { from: Date; to: Date; granularity: string }
	lastPlatformConvCountsArgs?: { from: Date; to: Date; granularity: string }

	async getTokenUsage(
		clientId: string,
		from: Date,
		to: Date,
		granularity: Granularity,
	) {
		this.lastTokenUsageArgs = { clientId, from, to, granularity }
		return this.tokenUsage
	}

	async getMessageCounts(
		clientId: string,
		from: Date,
		to: Date,
		granularity: Granularity,
	) {
		this.lastMessageCountArgs = { clientId, from, to, granularity }
		return this.messageCounts
	}

	async getClientSummary(clientId: string) {
		this.lastClientSummaryClientId = clientId
		return this.clientSummary
	}

	async getPlatformStats() {
		return this.platformStats
	}

	async getActiveTenantCount(_days: number) {
		return this.activeTenantCount
	}

	async getPlatformTokenUsageOverTime(
		from: Date,
		to: Date,
		granularity: Granularity,
	) {
		this.lastPlatformTokenUsageArgs = { from, to, granularity }
		return this.platformTokenUsage
	}

	async getPlatformConversationCountsOverTime(
		from: Date,
		to: Date,
		granularity: Granularity,
	) {
		this.lastPlatformConvCountsArgs = { from, to, granularity }
		return this.platformConversationCounts
	}

	async getAvgPlatformSatisfaction() {
		return this.avgPlatformSatisfaction
	}
}
