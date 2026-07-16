import { APICallError, RetryError } from "ai"

type AiStreamErrorCode =
	| "AI_RATE_LIMITED"
	| "AI_SERVICE_UNAVAILABLE"
	| "RESPONSE_INTERRUPTED"

type AiStreamError = {
	code: AiStreamErrorCode
	message: string
	diagnostics: {
		errorType: string
		statusCode?: number
		retryable?: boolean
	}
}

export function classifyAiStreamError(
	error: unknown,
	hasOutput: boolean,
): AiStreamError {
	const cause = RetryError.isInstance(error) ? error.lastError : error
	const diagnostics: AiStreamError["diagnostics"] = {
		errorType: cause instanceof Error ? cause.name : typeof cause,
	}

	if (APICallError.isInstance(cause)) {
		diagnostics.statusCode = cause.statusCode
		diagnostics.retryable = cause.isRetryable
	}

	if (hasOutput) {
		return {
			code: "RESPONSE_INTERRUPTED",
			message: "The response was interrupted. Please try again.",
			diagnostics,
		}
	}

	if (APICallError.isInstance(cause) && cause.statusCode === 429) {
		return {
			code: "AI_RATE_LIMITED",
			message: "The chat service is busy. Please try again shortly.",
			diagnostics,
		}
	}

	return {
		code: "AI_SERVICE_UNAVAILABLE",
		message:
			"The chat service is temporarily unavailable. Please try again shortly.",
		diagnostics,
	}
}
