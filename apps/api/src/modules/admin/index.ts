import { db } from "../../db"
import { AdminRepository } from "./admin.repository"
import {
	createAdminActivityLogsRouter,
	createAdminAuthRouter,
	createAdminClientRouter,
	createAdminConversationRouter,
	createAdminMeRouter,
} from "./admin.routes"
import { AdminService } from "./admin.service"

const adminRepository = new AdminRepository(db)
export const adminService = new AdminService(adminRepository)

export const adminAuthRoutes = createAdminAuthRouter(adminService)
export const adminClientRoutes = createAdminClientRouter(adminService)
export const adminMeRoutes = createAdminMeRouter(adminService)
export const adminConversationRoutes =
	createAdminConversationRouter(adminService)
export const adminActivityLogsRoutes =
	createAdminActivityLogsRouter(adminService)
