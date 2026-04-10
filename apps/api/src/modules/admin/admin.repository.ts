import { and, count, eq, sum } from "drizzle-orm"
import type { DB } from "../../db"
import {
	adminUsers,
	clients,
	conversations,
	usageRecords,
} from "../../db/schema"

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
}
