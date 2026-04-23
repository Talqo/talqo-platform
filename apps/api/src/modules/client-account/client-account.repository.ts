import { eq, sql } from "drizzle-orm"
import type { DB } from "../../db"
import { clients } from "../../db/schema"

export class ClientAccountRepository {
	constructor(private readonly db: DB) {}

	async getClientById(id: string) {
		return this.db
			.select({
				id: clients.id,
				name: clients.name,
				email: clients.email,
				balanceUsd: clients.balanceUsd,
				monthlyUsageLimit: clients.monthlyUsageLimit,
				usageAlertThresholdUsd: clients.usageAlertThresholdUsd,
				widgetToken: clients.widgetToken,
				status: clients.status,
				lastActive: clients.lastActive,
				createdAt: clients.createdAt,
				widgetSetupDismissed: clients.widgetSetupDismissed,
			})
			.from(clients)
			.where(eq(clients.id, id))
			.then((rows) => rows[0] ?? null)
	}

	async updateClient(
		id: string,
		data: Partial<{
			name: string
			email: string
			widgetSetupDismissed: boolean
		}>,
	) {
		const [updated] = await this.db
			.update(clients)
			.set(data)
			.where(eq(clients.id, id))
			.returning({
				id: clients.id,
				name: clients.name,
				email: clients.email,
			})
		return updated ?? null
	}

	async updatePassword(id: string, passwordHash: string) {
		await this.db
			.update(clients)
			.set({ passwordHash })
			.where(eq(clients.id, id))
	}

	async getPasswordHash(id: string): Promise<string | null> {
		const row = await this.db
			.select({ passwordHash: clients.passwordHash })
			.from(clients)
			.where(eq(clients.id, id))
			.then((rows) => rows[0] ?? null)
		return row?.passwordHash ?? null
	}

	async addBalance(id: string, amount: string) {
		const [updated] = await this.db
			.update(clients)
			.set({ balanceUsd: sql`${clients.balanceUsd} + ${amount}` })
			.where(eq(clients.id, id))
			.returning({ balanceUsd: clients.balanceUsd })
		return updated ?? null
	}

	async setUsageLimit(id: string, limit: string | null) {
		await this.db
			.update(clients)
			.set({ monthlyUsageLimit: limit })
			.where(eq(clients.id, id))
	}

	async setUsageAlert(id: string, thresholdUsd: string | null) {
		await this.db
			.update(clients)
			.set({ usageAlertThresholdUsd: thresholdUsd })
			.where(eq(clients.id, id))
	}

	async findByEmail(email: string) {
		return this.db
			.select({ id: clients.id })
			.from(clients)
			.where(eq(clients.email, email))
			.then((rows) => rows[0] ?? null)
	}
}
