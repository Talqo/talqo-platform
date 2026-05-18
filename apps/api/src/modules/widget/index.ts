import { db } from "@/db"
import { BotConfigRepository } from "@/modules/bot-config/bot-config.repository"
import { McpRepository } from "@/modules/mcp/mcp.repository"
import { ProviderConfigRepository } from "@/modules/provider-config/provider-config.repository"
import { WidgetRepository } from "./widget.repository"
import { WidgetService } from "./widget.service"

export { WidgetService } from "./widget.service"

let _widgetService: WidgetService | undefined

// Lazy load widgetService to avoid DB init issues in test mocks
export const widgetService = (() => {
	const get = () => {
		if (!_widgetService) {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const { ragService } = require("@/modules/rag/index")
			_widgetService = new WidgetService({
				widgetRepository: new WidgetRepository(db),
				botConfigRepository: new BotConfigRepository(db),
				providerConfigRepository: new ProviderConfigRepository(db),
				mcpRepository: new McpRepository(db),
				ragService,
			})
		}
		return _widgetService
	}

	// Return a proxy that delegates all property access to the lazy-loaded service
	return new Proxy({} as WidgetService, {
		get: (_target, prop) => {
			const service = get()
			return Reflect.get(service, prop)
		},
		has: (_target, prop) => {
			const service = get()
			return Reflect.has(service, prop)
		},
		ownKeys: (_target) => {
			const service = get()
			return Reflect.ownKeys(service)
		},
		getOwnPropertyDescriptor: (_target, prop) => {
			const service = get()
			return Reflect.getOwnPropertyDescriptor(service, prop)
		},
	})
})()

export {
	widgetConfigRoutes,
	widgetConversationRoutes,
	widgetMessageRoutes,
	widgetSessionRoutes,
} from "./widget.routes"
