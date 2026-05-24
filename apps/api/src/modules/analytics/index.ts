import { db } from "@/db"
import { DrizzleAnalyticsRepository } from "./analytics.repository"
import { AnalyticsService } from "./analytics.service"

const analyticsRepository = new DrizzleAnalyticsRepository(db)
export const analyticsService = new AnalyticsService(analyticsRepository)

export {
	adminAnalyticsRoutes,
	clientAnalyticsRoutes,
} from "./analytics.routes"
