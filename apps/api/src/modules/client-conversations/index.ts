import { db } from "@/db"
import { ClientConversationRepository } from "./client-conversations.repository"
import { createClientConversationRouter } from "./client-conversations.routes"
import { ClientConversationService } from "./client-conversations.service"

const repo = new ClientConversationRepository(db)
const service = new ClientConversationService(repo)

export const clientConversationRoutes = createClientConversationRouter(service)
