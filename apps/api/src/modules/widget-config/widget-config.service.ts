import { defaultWidgetVisualConfig, type WidgetVisualConfig } from "shared"
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
		// position and color/icon objects are validated by widgetVisualConfigSchema on write,
		// so the stored values always conform to WidgetVisualConfig's shape
		return {
			botName: row.botName,
			position: row.position as WidgetVisualConfig["position"],
			lightColors: row.lightColors as WidgetVisualConfig["lightColors"],
			darkColors: row.darkColors as WidgetVisualConfig["darkColors"],
			icons: row.icons as WidgetVisualConfig["icons"],
		}
	}

	async saveConfig(
		clientId: string,
		data: WidgetConfigData,
	): Promise<WidgetVisualConfig> {
		const row = await this.repo.upsert(clientId, data)
		return {
			botName: row.botName,
			position: row.position as WidgetVisualConfig["position"],
			lightColors: row.lightColors as WidgetVisualConfig["lightColors"],
			darkColors: row.darkColors as WidgetVisualConfig["darkColors"],
			icons: row.icons as WidgetVisualConfig["icons"],
		}
	}
}
