import { db } from "@/db"
import { DrizzleClientAccountRepository } from "./client-account.repository"
import { ClientAccountService } from "./client-account.service"

const clientAccountRepository = new DrizzleClientAccountRepository(db)
export const clientAccountService = new ClientAccountService(
	clientAccountRepository,
)

export { default as clientAccountRoutes } from "./client-account.routes"
