export function toUserFriendlyError(message: string): string {
	if (
		/HTTP 429/i.test(message) ||
		/rate.?limit/i.test(message) ||
		/too many/i.test(message)
	) {
		return "You've sent too many messages. Please wait a moment before trying again."
	}
	if (
		/HTTP 40[13]/i.test(message) ||
		/unauthorized/i.test(message) ||
		/forbidden/i.test(message)
	) {
		return "Unable to authenticate. Please refresh the page."
	}
	if (
		/HTTP 5\d\d/i.test(message) ||
		/server error/i.test(message) ||
		/no ai provider/i.test(message) ||
		/invalid provider config/i.test(message)
	) {
		return "The chat service is temporarily unavailable. Please try again shortly."
	}
	if (/HTTP \d+/i.test(message)) {
		return "Something went wrong. Please try again."
	}
	if (/no response body/i.test(message) || /failed to fetch/i.test(message)) {
		return "Unable to connect. Please check your connection and try again."
	}
	if (/failed to start conversation/i.test(message)) {
		return "Unable to start a new chat. Please refresh the page."
	}
	return message
}
