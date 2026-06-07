import { db } from "@/db"
import { DrizzleWidgetConfigRepository } from "./widget-config.repository"
import { WidgetConfigService } from "./widget-config.service"

const widgetConfigRepository = new DrizzleWidgetConfigRepository(db)
export const widgetConfigService = new WidgetConfigService(
	widgetConfigRepository,
)

export { widgetConfigClientRoutes } from "./widget-config.client.routes"
