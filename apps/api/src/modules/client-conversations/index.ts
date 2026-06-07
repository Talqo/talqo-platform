import { db } from "@/db"
import { ClientConversationRepository } from "./client-conversations.repository"
import { createClientConversationsRouter } from "./client-conversations.routes"
import { ClientConversationService } from "./client-conversations.service"

const repo = new ClientConversationRepository(db)
export const clientConversationService = new ClientConversationService(repo)
export const clientConversationRoutes = createClientConversationsRouter(
	clientConversationService,
)
