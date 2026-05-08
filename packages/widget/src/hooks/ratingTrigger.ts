import { DEFAULT_WELCOME_MESSAGE, type Message } from "./useWidget"

export function shouldShowRatingPrompt(
	messages: Message[],
	ratingSubmitted: boolean,
): boolean {
	if (ratingSubmitted) return false

	const hasUserMessage = messages.some((m) => m.role === "user")
	const hasAssistantResponse = messages.some(
		(m) => m.role === "assistant" && m.content !== DEFAULT_WELCOME_MESSAGE,
	)

	return hasUserMessage && hasAssistantResponse
}
