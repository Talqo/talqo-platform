import { db } from "../../db"
import { AnalyticsRepository } from "./analytics.repository"
import { AnalyticsService } from "./analytics.service"

const analyticsRepository = new AnalyticsRepository(db)
export const analyticsService = new AnalyticsService(analyticsRepository)

export {
	adminAnalyticsRoutes,
	clientAnalyticsRoutes,
} from "./analytics.routes"
