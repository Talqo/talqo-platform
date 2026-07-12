import { eq, sql } from "drizzle-orm"
import type { DB } from "@/db"
import { clients, pendingRegistrations } from "@/db/schema"

type ClientProfile = {
	id: string
	name: string
	email: string
	balanceUsd: number
	monthlyUsageLimit: number | null
	usageAlertThresholdUsd: number | null
	widgetToken: string
	status: string
	lastActive: Date | null
	createdAt: Date
	widgetSetupDismissed: boolean
} | null

export type ClientAccountRepository = {
	getClientById(id: string): Promise<ClientProfile>
	updateClient(
		id: string,
		data: Partial<{
			name: string
			email: string
			widgetSetupDismissed: boolean
		}>,
	): Promise<{ id: string; name: string; email: string } | null>
	updatePassword(id: string, passwordHash: string): Promise<void>
	getPasswordHash(id: string): Promise<string | null>
	addBalance(id: string, amount: number): Promise<{ balanceUsd: number } | null>
	setUsageLimit(id: string, limit: number | null): Promise<void>
	setUsageAlert(id: string, thresholdUsd: number | null): Promise<void>
	setWidgetToken(
		id: string,
		widgetToken: string,
	): Promise<{ widgetToken: string } | null>
	findByEmail(email: string): Promise<{ id: string } | null>
	deleteAccount(id: string): Promise<void>
}

export class DrizzleClientAccountRepository implements ClientAccountRepository {
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
			.set({ passwordHash, tokenVersion: sql`${clients.tokenVersion} + 1` })
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

	async addBalance(id: string, amount: number) {
		const [updated] = await this.db
			.update(clients)
			.set({ balanceUsd: sql`${clients.balanceUsd} + ${amount}` })
			.where(eq(clients.id, id))
			.returning({ balanceUsd: clients.balanceUsd })
		return updated ?? null
	}

	async setUsageLimit(id: string, limit: number | null) {
		await this.db
			.update(clients)
			.set({ monthlyUsageLimit: limit })
			.where(eq(clients.id, id))
	}

	async setUsageAlert(id: string, thresholdUsd: number | null) {
		await this.db
			.update(clients)
			.set({
				usageAlertThresholdUsd: thresholdUsd,
			})
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
		await this.db.transaction(async (tx) => {
			await tx
				.delete(pendingRegistrations)
				.where(eq(pendingRegistrations.consumedByClientId, id))
			await tx.delete(clients).where(eq(clients.id, id))
		})
	}
}

type ClientRow = {
	id: string
	name: string
	email: string
	passwordHash: string
	balanceUsd: number
	widgetToken: string
	tokenVersion?: number
}

export class InMemoryClientAccountRepository
	implements ClientAccountRepository
{
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
			monthlyUsageLimit: null as number | null,
			usageAlertThresholdUsd: null as number | null,
			widgetToken: c.widgetToken,
			status: "active",
			lastActive: null as Date | null,
			createdAt: new Date(),
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
		if (c) {
			c.passwordHash = passwordHash
			c.tokenVersion = (c.tokenVersion ?? 0) + 1
		}
	}

	async getPasswordHash(id: string): Promise<string | null> {
		return this.store.get(id)?.passwordHash ?? null
	}

	async addBalance(id: string, amount: number) {
		const c = this.store.get(id)
		if (!c) return null
		c.balanceUsd += amount
		return { balanceUsd: c.balanceUsd }
	}

	async setUsageLimit(_id: string, _limit: number | null) {}

	async setUsageAlert(_id: string, _thresholdUsd: number | null) {}

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
