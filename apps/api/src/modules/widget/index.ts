import { WidgetService } from "./widget.service"

export { WidgetService } from "./widget.service"

let _widgetService: WidgetService | undefined

// Lazy load widgetService to avoid DB init issues in test mocks
export const widgetService = (() => {
	const get = () => {
		if (!_widgetService) {
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const { db } = require("@/db")
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const {
				BlacklistRepository,
			} = require("@/modules/blacklist/blacklist.repository")
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const { botConfigService } = require("@/modules/bot-config")
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const { mcpService } = require("@/modules/mcp")
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const { providerConfigService } = require("@/modules/provider-config")
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const { WidgetRepository } = require("./widget.repository")
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const { ragService } = require("@/modules/rag/index")
			_widgetService = new WidgetService({
				widgetRepository: new WidgetRepository(db),
				botConfigService,
				providerConfigService,
				mcpService,
				blacklistRepository: new BlacklistRepository(db),
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
