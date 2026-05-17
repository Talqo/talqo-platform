import {
	defaultWidgetVisualConfig,
	type WidgetVisualConfig,
	widgetVisualConfigSchema,
} from "shared"
import type {
	WidgetConfigData,
	WidgetConfigRepository,
} from "./widget-config.repository"

export class WidgetConfigService {
	constructor(private readonly repo: WidgetConfigRepository) {}

	async getConfig(clientId: string): Promise<WidgetVisualConfig> {
		const row = await this.repo.findByClientId(clientId)
		if (!row) {
			return { ...defaultWidgetVisualConfig }
		}
		return widgetVisualConfigSchema.parse({
			botName: row.botName,
			position: row.position,
			lightColors: row.lightColors,
			darkColors: row.darkColors,
			icons: row.icons,
		})
	}

	async saveConfig(
		clientId: string,
		data: WidgetConfigData,
	): Promise<WidgetVisualConfig> {
		const row = await this.repo.upsert(clientId, data)
		return widgetVisualConfigSchema.parse({
			botName: row.botName,
			position: row.position,
			lightColors: row.lightColors,
			darkColors: row.darkColors,
			icons: row.icons,
		})
	}
}
