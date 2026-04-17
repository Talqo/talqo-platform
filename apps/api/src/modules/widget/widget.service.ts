import { NotFoundError, ValidationError } from "../../common/errors"
import type { WidgetRepository } from "./widget.repository"

export class WidgetService {
	constructor(private readonly repo: WidgetRepository) {}

	async createOrResumeSession(clientId: string, browserSessionId: string) {
		return this.repo.findOrCreateSession(clientId, browserSessionId)
	}

	async startConversation(clientId: string, sessionId: string) {
		const session = await this.repo.getSession(sessionId, clientId)
		if (!session) throw new NotFoundError("Session not found")
		return this.repo.createConversation(sessionId, clientId)
	}

	async getMessageHistory(clientId: string, conversationId: string) {
		const msgs = await this.repo.getMessages(conversationId, clientId)
		if (msgs === null) throw new NotFoundError("Conversation not found")
		return msgs
	}

	/**
	 * Saves the user message and returns a placeholder assistant response.
	 * Full LLM integration (streaming, tool calls, blacklist filtering) is
	 * a separate concern that will be layered on top of this foundation.
	 */
	async sendMessage(
		clientId: string,
		conversationId: string,
		content: string,
	): Promise<{
		userMessage: Awaited<ReturnType<WidgetRepository["createMessage"]>>
		assistantMessage: Awaited<ReturnType<WidgetRepository["createMessage"]>>
	}> {
		const conversation = await this.repo.getConversation(
			conversationId,
			clientId,
		)
		if (!conversation) throw new NotFoundError("Conversation not found")

		const userMessage = await this.repo.createMessage(
			conversationId,
			"user",
			content,
		)

		// Placeholder response — LLM integration will replace this
		const assistantContent = "[LLM response not yet implemented]"
		const assistantMessage = await this.repo.createMessage(
			conversationId,
			"assistant",
			assistantContent,
		)

		return { userMessage, assistantMessage }
	}

	async resetConversation(clientId: string, conversationId: string) {
		const deleted = await this.repo.deleteConversation(conversationId, clientId)
		if (!deleted) throw new NotFoundError("Conversation not found")
	}

	async rateConversation(
		clientId: string,
		conversationId: string,
		rating: number,
	) {
		if (rating < 1 || rating > 5) {
			throw new ValidationError("Rating must be between 1 and 5")
		}
		const updated = await this.repo.rateConversation(
			conversationId,
			clientId,
			rating,
		)
		if (!updated) throw new NotFoundError("Conversation not found")
		return updated
	}
}
