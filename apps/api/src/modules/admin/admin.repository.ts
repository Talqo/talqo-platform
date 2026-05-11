import { and, count, desc, eq, inArray, sum } from "drizzle-orm"
import type { DB } from "@/db"
import {
	adminAccessLogs,
	adminUsers,
	clients,
	conversations,
	messages,
	usageRecords,
} from "@/db/schema"

export class AdminRepository {
	constructor(private readonly db: DB) {}

	async findAdminByEmail(email: string) {
		return this.db
			.select()
			.from(adminUsers)
			.where(and(eq(adminUsers.email, email), eq(adminUsers.isDeleted, false)))
			.then((rows) => rows.at(0) ?? null)
	}

	async findAdminById(id: string) {
		return this.db
			.select()
			.from(adminUsers)
			.where(and(eq(adminUsers.id, id), eq(adminUsers.isDeleted, false)))
			.then((rows) => rows.at(0) ?? null)
	}

	async listClients(limit: number, offset: number) {
		return this.db
			.select({
				id: clients.id,
				name: clients.name,
				email: clients.email,
				balanceUsd: clients.balanceUsd,
				status: clients.status,
				lastActive: clients.lastActive,
				createdAt: clients.createdAt,
			})
			.from(clients)
			.limit(limit)
			.offset(offset)
			.orderBy(clients.createdAt)
	}

	async getClientDetail(clientId: string) {
		const client = await this.db
			.select({
				id: clients.id,
				name: clients.name,
				email: clients.email,
				balanceUsd: clients.balanceUsd,
				monthlyUsageLimit: clients.monthlyUsageLimit,
				usageAlertThresholdUsd: clients.usageAlertThresholdUsd,
				status: clients.status,
				lastActive: clients.lastActive,
				createdAt: clients.createdAt,
			})
			.from(clients)
			.where(eq(clients.id, clientId))
			.then((rows) => rows.at(0) ?? null)

		if (!client) return null

		const [usage] = await this.db
			.select({
				totalTokens: sum(usageRecords.tokensUsed).mapWith(Number),
				totalCostUsd: sum(usageRecords.costUsd),
			})
			.from(usageRecords)
			.where(eq(usageRecords.clientId, clientId))

		const [convStats] = await this.db
			.select({ totalConversations: count(conversations.id) })
			.from(conversations)
			.where(eq(conversations.clientId, clientId))

		return {
			...client,
			totalTokens: usage?.totalTokens ?? 0,
			totalCostUsd: usage?.totalCostUsd ?? "0",
			totalConversations: convStats?.totalConversations ?? 0,
		}
	}

	async updateClientStatus(clientId: string, status: string) {
		const rows = await this.db
			.update(clients)
			.set({ status })
			.where(eq(clients.id, clientId))
			.returning({ id: clients.id, status: clients.status })
		return rows.at(0) ?? null
	}

	async listConversations({
		clientId,
		limit,
		offset,
	}: {
		clientId?: string
		limit: number
		offset: number
	}) {
		return this.db
			.select({
				id: conversations.id,
				clientId: conversations.clientId,
				clientName: clients.name,
				clientEmail: clients.email,
				startedAt: conversations.startedAt,
				satisfactionRating: conversations.satisfactionRating,
				messageCount: count(messages.id),
			})
			.from(conversations)
			.innerJoin(clients, eq(conversations.clientId, clients.id))
			.leftJoin(messages, eq(messages.conversationId, conversations.id))
			.where(clientId ? eq(conversations.clientId, clientId) : undefined)
			.groupBy(
				conversations.id,
				conversations.clientId,
				conversations.startedAt,
				conversations.satisfactionRating,
				clients.name,
				clients.email,
			)
			.orderBy(desc(conversations.startedAt))
			.limit(limit)
			.offset(offset)
	}

	async listActivityLogs({ limit, offset }: { limit: number; offset: number }) {
		return this.db
			.select({
				id: adminAccessLogs.id,
				adminId: adminAccessLogs.adminId,
				adminEmail: adminUsers.email,
				clientId: adminAccessLogs.clientId,
				clientName: clients.name,
				clientEmail: clients.email,
				actionType: adminAccessLogs.actionType,
				createdAt: adminAccessLogs.createdAt,
			})
			.from(adminAccessLogs)
			.innerJoin(adminUsers, eq(adminUsers.id, adminAccessLogs.adminId))
			.leftJoin(clients, eq(clients.id, adminAccessLogs.clientId))
			.where(
				inArray(adminAccessLogs.actionType, [
					"impersonate",
					"suspend",
					"re-enable",
				]),
			)
			.orderBy(desc(adminAccessLogs.createdAt))
			.limit(limit)
			.offset(offset)
	}

	async getConversationWithMessages(conversationId: string) {
		const row = await this.db
			.select({
				id: conversations.id,
				clientId: conversations.clientId,
				clientName: clients.name,
				clientEmail: clients.email,
				startedAt: conversations.startedAt,
				satisfactionRating: conversations.satisfactionRating,
			})
			.from(conversations)
			.innerJoin(clients, eq(conversations.clientId, clients.id))
			.where(eq(conversations.id, conversationId))
			.then((rows) => rows.at(0) ?? null)

		if (!row) return null

		const msgs = await this.db
			.select()
			.from(messages)
			.where(eq(messages.conversationId, conversationId))
			.orderBy(messages.createdAt)

		return { ...row, messages: msgs }
	}
}
