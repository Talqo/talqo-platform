import { NotFoundError } from "@/common/errors"
import type { ClientConversationRepository } from "./client-conversations.repository"

export class ClientConversationService {
	constructor(private readonly repo: ClientConversationRepository) {}

	async listConversations(clientId: string, limit: number, offset: number) {
		return this.repo.listConversations({ clientId, limit, offset })
	}

	async getConversation(conversationId: string, clientId: string) {
		const conv = await this.repo.getConversationWithMessages(
			conversationId,
			clientId,
		)
		if (!conv) throw new NotFoundError("Conversation not found")
		return conv
	}
}
