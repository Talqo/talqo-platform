import { eq } from "drizzle-orm"
import type { ProviderType } from "shared"
import type { DB } from "../../db"
import { aiProviderConfigs } from "../../db/schema"

type ProviderConfigUpsert = {
	providerType: ProviderType
	apiKeyEncrypted: string
	model: string
	baseUrl?: string | null
}

export class ProviderConfigRepository {
	constructor(private readonly db: DB) {}

	async getByClientId(clientId: string) {
		return this.db
			.select()
			.from(aiProviderConfigs)
			.where(eq(aiProviderConfigs.clientId, clientId))
			.then((rows) => rows[0] ?? null)
	}

	async upsert(clientId: string, data: ProviderConfigUpsert) {
		const [row] = await this.db
			.insert(aiProviderConfigs)
			.values({ clientId, ...data })
			.onConflictDoUpdate({
				target: aiProviderConfigs.clientId,
				set: { ...data, updatedAt: new Date() },
			})
			.returning()
		return row
	}

	async deleteByClientId(clientId: string): Promise<boolean> {
		const result = await this.db
			.delete(aiProviderConfigs)
			.where(eq(aiProviderConfigs.clientId, clientId))
			.returning({ id: aiProviderConfigs.id })
		return result.length > 0
	}
}
