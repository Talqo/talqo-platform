type ErrorDetails = {
	code?: string
	message: string
}

function getErrorDetails(error: unknown): ErrorDetails {
	if (typeof error === "string") return { message: error }
	if (error instanceof Error) {
		return {
			code:
				"code" in error && typeof error.code === "string"
					? error.code
					: undefined,
			message: error.message,
		}
	}
	if (typeof error === "object" && error !== null) {
		const value = error as { code?: unknown; message?: unknown }
		return {
			code: typeof value.code === "string" ? value.code : undefined,
			message:
				typeof value.message === "string" ? value.message : String(error),
		}
	}
	return { message: String(error) }
}

export function toUserFriendlyError(error: unknown): string {
	const { code, message } = getErrorDetails(error)
	if (code === "AI_RATE_LIMITED" || code === "TOO_MANY_REQUESTS") {
		return "The chat service is busy. Please wait a moment and try again."
	}
	if (code === "RESPONSE_INTERRUPTED" || code === "STREAM_ENDED") {
		return "The response was interrupted. Please try again."
	}
	if (code === "MONTHLY_LIMIT_REACHED" || code === "BALANCE_INSUFFICIENT") {
		return "This chat has reached its usage limit. Please try again later."
	}
	if (code === "CONVERSATION_LIMIT_REACHED") {
		return "This conversation has reached its message limit. Please start a new chat."
	}
	if (code === "BLACKLIST_TRIGGERED") {
		return "The response was blocked by the content filter."
	}
	if (
		code === "AI_SERVICE_UNAVAILABLE" ||
		code === "AI_CONFIGURATION_ERROR" ||
		code === "INTERNAL_ERROR" ||
		code === "RESPONSE_NOT_SAVED"
	) {
		return "The chat service is temporarily unavailable. Please try again shortly."
	}
	if (
		/HTTP 429/i.test(message) ||
		/rate.?limit/i.test(message) ||
		/too many/i.test(message)
	) {
		return "You've sent too many messages. Please wait a moment before trying again."
	}
	if (/insufficient balance/i.test(message)) {
		return "Account balance depleted"
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
	console.warn("Unhandled error", { code, message })
	return "An unexpected error occurred"
}
