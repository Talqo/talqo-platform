import { eq } from "drizzle-orm"
import type { DB } from "../../db"
import { widgetConfigs } from "../../db/schema"

type WidgetConfigRow = {
	id: string
	clientId: string
	botName: string
	position: string
	lightColors: Record<string, string>
	darkColors: Record<string, string>
	icons: Record<string, string>
	updatedAt: string
}

export type WidgetConfigData = {
	botName: string
	position: string
	lightColors: Record<string, string>
	darkColors: Record<string, string>
	icons: Record<string, string>
}

export type WidgetConfigRepository = {
	findByClientId(clientId: string): Promise<WidgetConfigRow | null>
	upsert(clientId: string, data: WidgetConfigData): Promise<WidgetConfigRow>
}

export class InMemoryWidgetConfigRepository implements WidgetConfigRepository {
	private rows = new Map<string, WidgetConfigRow>()
	private idCounter = 0

	async findByClientId(clientId: string): Promise<WidgetConfigRow | null> {
		return this.rows.get(clientId) ?? null
	}

	async upsert(
		clientId: string,
		data: WidgetConfigData,
	): Promise<WidgetConfigRow> {
		const existing = this.rows.get(clientId)
		const row: WidgetConfigRow = {
			id: existing?.id ?? `wc-${++this.idCounter}`,
			clientId,
			...data,
			updatedAt: new Date().toISOString(),
		}
		this.rows.set(clientId, row)
		return row
	}
}

export class DrizzleWidgetConfigRepository implements WidgetConfigRepository {
	constructor(private readonly db: DB) {}

	async findByClientId(clientId: string): Promise<WidgetConfigRow | null> {
		const row = await this.db
			.select()
			.from(widgetConfigs)
			.where(eq(widgetConfigs.clientId, clientId))
			.then((rows) => rows[0] ?? null)

		if (!row) return null

		return {
			...row,
			updatedAt: row.updatedAt.toISOString(),
		}
	}

	async upsert(
		clientId: string,
		data: WidgetConfigData,
	): Promise<WidgetConfigRow> {
		const now = new Date()
		const [row] = await this.db
			.insert(widgetConfigs)
			.values({ clientId, ...data, updatedAt: now })
			.onConflictDoUpdate({
				target: widgetConfigs.clientId,
				set: { ...data, updatedAt: now },
			})
			.returning()

		if (!row)
			throw new Error(
				`Failed to upsert widget config for clientId: ${clientId}`,
			)

		return {
			...row,
			updatedAt: row.updatedAt.toISOString(),
		}
	}
}
