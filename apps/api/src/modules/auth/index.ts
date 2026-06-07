import { db } from "@/db"
import { DrizzleAuthRepository } from "./auth.repository"
import { AuthService } from "./auth.service"

const authRepository = new DrizzleAuthRepository(db)
export const authService = new AuthService(authRepository)

export { authRoutes } from "./auth.routes"
