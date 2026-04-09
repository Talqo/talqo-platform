import { eq } from "drizzle-orm";
import type { DB } from "../../db";
import { botConfigs } from "../../db/schema";

type BotConfigUpdate = Partial<{
	systemPrompt: string | null;
	defaultRole: string | null;
	toneStyle: string | null;
	internetSearchEnabled: boolean;
}>;

export class BotConfigRepository {
	constructor(private readonly db: DB) {}

	async getByClientId(clientId: string) {
		return this.db
			.select()
			.from(botConfigs)
			.where(eq(botConfigs.clientId, clientId))
			.then((rows) => rows[0] ?? null);
	}

	async upsert(clientId: string, data: BotConfigUpdate) {
		const [row] = await this.db
			.insert(botConfigs)
			.values({ clientId, ...data })
			.onConflictDoUpdate({
				target: botConfigs.clientId,
				set: { ...data, updatedAt: new Date() },
			})
			.returning();
		return row;
	}
}
