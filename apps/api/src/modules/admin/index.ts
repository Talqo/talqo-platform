import { db } from "../../db"
import { AdminRepository } from "./admin.repository"
import { createAdminAuthRouter, createAdminClientRouter } from "./admin.routes"
import { AdminService } from "./admin.service"

const adminRepository = new AdminRepository(db)
export const adminService = new AdminService(adminRepository)

export const adminAuthRoutes = createAdminAuthRouter(adminService)
export const adminClientRoutes = createAdminClientRouter(adminService)
