import { and, count, countDistinct, eq, gte, lte, sql, sum } from "drizzle-orm";
import type { DB } from "../../db";
import {
	clients,
	conversations,
	messages,
	usageRecords,
} from "../../db/schema";

type Granularity = "day" | "week" | "month";

export class AnalyticsRepository {
	constructor(private readonly db: DB) {}

	async getTokenUsage(
		clientId: string,
		from: Date,
		to: Date,
		granularity: Granularity,
	) {
		const bucket = sql<string>`date_trunc(${granularity}, ${usageRecords.recordedAt})`;
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
			.orderBy(bucket);
	}

	async getMessageCounts(
		clientId: string,
		from: Date,
		to: Date,
		granularity: Granularity,
	) {
		const bucket = sql<string>`date_trunc(${granularity}, ${messages.createdAt})`;
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
			.orderBy(bucket);
	}

	async getPlatformStats() {
		const [tokenStats] = await this.db
			.select({
				totalTokens: sum(usageRecords.tokensUsed).mapWith(Number),
				totalCostUsd: sum(usageRecords.costUsd),
			})
			.from(usageRecords);

		const [clientStats] = await this.db
			.select({
				activeClients: countDistinct(clients.id),
			})
			.from(clients)
			.where(eq(clients.status, "active"));

		const [convStats] = await this.db
			.select({ totalConversations: count(conversations.id) })
			.from(conversations);

		return {
			totalTokens: tokenStats?.totalTokens ?? 0,
			totalCostUsd: tokenStats?.totalCostUsd ?? "0",
			activeClients: clientStats?.activeClients ?? 0,
			totalConversations: convStats?.totalConversations ?? 0,
		};
	}
}
