import type { Message } from "./useWidget"

export function shouldShowRatingPrompt(
	messages: Message[],
	ratingSubmitted: boolean,
): boolean {
	if (ratingSubmitted) return false

	const hasUserMessage = messages.some((m) => m.role === "user")
	const hasAssistantResponse = messages.some(
		(m) =>
			m.role === "assistant" && m.content !== "Hi! How can I help you today?",
	)

	return hasUserMessage && hasAssistantResponse
}
