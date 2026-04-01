import { db } from "../../db";
import { AdminRepository } from "./admin.repository";
import { AdminService } from "./admin.service";

const adminRepository = new AdminRepository(db);
export const adminService = new AdminService(adminRepository);

export { adminAuthRoutes, adminClientRoutes } from "./admin.routes";
