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
import type { DB } from "../../db"
import {
	clients,
	conversations,
	endUserSessions,
	messages,
	usageRecords,
} from "../../db/schema"

export type Granularity = "day" | "week" | "month"

export class AnalyticsRepository {
	constructor(private readonly db: DB) {}

	async getTokenUsage(
		clientId: string,
		from: Date,
		to: Date,
		granularity: Granularity,
	) {
		const bucket = sql<string>`date_trunc(${sql.raw(`'${granularity}'`)}, ${usageRecords.recordedAt})`
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
		const bucket = sql<string>`date_trunc(${sql.raw(`'${granularity}'`)}, ${messages.createdAt})`
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
}

type TokenUsageRow = {
	period: string
	tokensUsed: number
	costUsd: string | null
}
type MessageCountRow = { period: string; messageCount: number }
type ClientSummary = Awaited<
	ReturnType<AnalyticsRepository["getClientSummary"]>
>
type PlatformStats = Awaited<
	ReturnType<AnalyticsRepository["getPlatformStats"]>
>

export class InMemoryAnalyticsRepository
	implements
		Pick<
			AnalyticsRepository,
			| "getTokenUsage"
			| "getMessageCounts"
			| "getClientSummary"
			| "getPlatformStats"
		>
{
	tokenUsage: TokenUsageRow[] = []
	messageCounts: MessageCountRow[] = []
	clientSummary: ClientSummary = {
		totalConversations: 0,
		uniqueUsers: 0,
		avgSatisfactionRating: 0,
		totalUserMessages: 0,
		totalTokens: 0,
		totalPageviewSessions: 0,
	}
	platformStats: PlatformStats = {
		totalTokens: 0,
		totalCostUsd: "0",
		activeClients: 0,
		totalConversations: 0,
	}

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
}
