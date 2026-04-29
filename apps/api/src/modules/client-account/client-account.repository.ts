import { eq, sql } from "drizzle-orm"
import type { DB } from "../../db"
import { clients, pendingRegistrations } from "../../db/schema"

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

	async setWidgetToken(id: string, widgetToken: string) {
		const [updated] = await this.db
			.update(clients)
			.set({ widgetToken })
			.where(eq(clients.id, id))
			.returning({ widgetToken: clients.widgetToken })
		return updated ?? null
	}

	async findByEmail(email: string) {
		return this.db
			.select({ id: clients.id })
			.from(clients)
			.where(eq(clients.email, email))
			.then((rows) => rows[0] ?? null)
	}

	async deleteAccount(id: string): Promise<void> {
		await this.db
			.delete(pendingRegistrations)
			.where(eq(pendingRegistrations.consumedByClientId, id))
		await this.db.delete(clients).where(eq(clients.id, id))
	}
}

type ClientRow = {
	id: string
	name: string
	email: string
	passwordHash: string
	balanceUsd: string
	widgetToken: string
}

export class InMemoryClientAccountRepository {
	private store = new Map<string, ClientRow>()
	deletedIds: string[] = []

	seed(client: ClientRow) {
		this.store.set(client.id, { ...client })
	}

	async getClientById(id: string) {
		const c = this.store.get(id)
		if (!c) return null
		return {
			id: c.id,
			name: c.name,
			email: c.email,
			balanceUsd: c.balanceUsd,
			monthlyUsageLimit: null as string | null,
			usageAlertThresholdUsd: null as string | null,
			widgetToken: c.widgetToken,
			status: "active",
			lastActive: null as string | null,
			createdAt: new Date().toISOString(),
			widgetSetupDismissed: false,
		}
	}

	async updateClient(
		id: string,
		data: Partial<{
			name: string
			email: string
			widgetSetupDismissed: boolean
		}>,
	) {
		const c = this.store.get(id)
		if (!c) return null
		Object.assign(c, data)
		return { id: c.id, name: c.name, email: c.email }
	}

	async updatePassword(id: string, passwordHash: string) {
		const c = this.store.get(id)
		if (c) c.passwordHash = passwordHash
	}

	async getPasswordHash(id: string): Promise<string | null> {
		return this.store.get(id)?.passwordHash ?? null
	}

	async addBalance(id: string, amount: string) {
		const c = this.store.get(id)
		if (!c) return null
		c.balanceUsd = (
			Number.parseFloat(c.balanceUsd) + Number.parseFloat(amount)
		).toFixed(4)
		return { balanceUsd: c.balanceUsd }
	}

	async setUsageLimit(_id: string, _limit: string | null) {}

	async setUsageAlert(_id: string, _thresholdUsd: string | null) {}

	async setWidgetToken(id: string, widgetToken: string) {
		const c = this.store.get(id)
		if (!c) return null
		c.widgetToken = widgetToken
		return { widgetToken }
	}

	async findByEmail(email: string) {
		for (const c of this.store.values()) {
			if (c.email === email) return { id: c.id }
		}
		return null
	}

	async deleteAccount(id: string): Promise<void> {
		this.store.delete(id)
		this.deletedIds.push(id)
	}
}
