import type { BotConfigRepository } from "./bot-config.repository";

type BotConfigUpdate = Partial<{
	systemPrompt: string | null;
	defaultRole: string | null;
	toneStyle: string | null;
	internetSearchEnabled: boolean;
}>;

export class BotConfigService {
	constructor(private readonly repo: BotConfigRepository) {}

	async getConfig(clientId: string) {
		const config = await this.repo.getByClientId(clientId);
		// A bot_config row is always created on client registration;
		// this handles edge cases where it might be missing.
		if (!config) {
			return this.repo.upsert(clientId, {});
		}
		return config;
	}

	async updateConfig(clientId: string, updates: BotConfigUpdate) {
		return this.repo.upsert(clientId, updates);
	}
}
