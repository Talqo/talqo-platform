import { db } from "@/db"
import { BotConfigRepository } from "@/modules/bot-config/bot-config.repository"
import { McpRepository } from "@/modules/mcp/mcp.repository"
import { ProviderConfigRepository } from "@/modules/provider-config/provider-config.repository"
import { WidgetRepository } from "./widget.repository"
import { WidgetService } from "./widget.service"

const widgetRepository = new WidgetRepository(db)
const botConfigRepository = new BotConfigRepository(db)
const providerConfigRepository = new ProviderConfigRepository(db)
const mcpRepository = new McpRepository(db)
export const widgetService = new WidgetService({
	widgetRepository,
	botConfigRepository,
	providerConfigRepository,
	mcpRepository,
})

export {
	widgetConfigRoutes,
	widgetConversationRoutes,
	widgetMessageRoutes,
	widgetSessionRoutes,
} from "./widget.routes"
