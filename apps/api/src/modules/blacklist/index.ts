import { db } from "../../db"
import { BlacklistRepository } from "./blacklist.repository"
import { BlacklistService } from "./blacklist.service"

const blacklistRepository = new BlacklistRepository(db)
export const blacklistService = new BlacklistService(blacklistRepository)

export { default as blacklistRoutes } from "./blacklist.routes"
