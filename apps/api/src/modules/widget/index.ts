import { db } from "../../db"
import { WidgetRepository } from "./widget.repository"
import { WidgetService } from "./widget.service"

const widgetRepository = new WidgetRepository(db)
export const widgetService = new WidgetService(widgetRepository)

export {
	widgetConversationRoutes,
	widgetMessageRoutes,
	widgetSessionRoutes,
} from "./widget.routes"
