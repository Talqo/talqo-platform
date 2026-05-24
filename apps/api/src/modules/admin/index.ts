import { db } from "@/db"
import { AdminRepository } from "./admin.repository"
import { AdminService } from "./admin.service"
import { AdminAuditLogRepository } from "./admin-audit-log.repository"
import { AdminAuditLogService } from "./admin-audit-log.service"

const adminRepository = new AdminRepository(db)
export const adminService = new AdminService(adminRepository)

const adminAuditLogRepository = new AdminAuditLogRepository(db)
export const adminAuditLogService = new AdminAuditLogService(
	adminAuditLogRepository,
)

export {
	adminActivityLogsRoutes,
	adminAuthRoutes,
	adminClientRoutes,
	adminConversationRoutes,
	adminMeRoutes,
} from "./admin.routes"
