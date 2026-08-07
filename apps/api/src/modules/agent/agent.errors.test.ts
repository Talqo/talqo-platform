import { describe, expect, it } from "bun:test"
import { APICallError, RetryError } from "ai"
import { classifyAiStreamError } from "./agent.errors"

function apiError(statusCode: number, isRetryable: boolean) {
	return new APICallError({
		message: `Provider returned ${statusCode}`,
		url: "https://provider.test/chat",
		requestBodyValues: {},
		statusCode,
		responseHeaders: {},
		responseBody: "provider details",
		isRetryable,
	})
}

describe("classifyAiStreamError", () => {
	it("classifies provider rate limits without exposing provider details", () => {
		const result = classifyAiStreamError(apiError(429, true), false)

		expect(result).toMatchObject({
			code: "AI_RATE_LIMITED",
			message: "The chat service is busy. Please try again shortly.",
			diagnostics: {
				errorType: "AI_APICallError",
				statusCode: 429,
				retryable: true,
			},
		})
	})

	it("unwraps exhausted retries", () => {
		const providerError = apiError(503, true)
		const result = classifyAiStreamError(
			new RetryError({
				message: "Retries exhausted",
				reason: "maxRetriesExceeded",
				errors: [providerError],
			}),
			false,
		)

		expect(result).toMatchObject({
			code: "AI_SERVICE_UNAVAILABLE",
			diagnostics: { statusCode: 503, retryable: true },
		})
	})

	it("classifies failures after output as interrupted responses", () => {
		const result = classifyAiStreamError(apiError(503, true), true)

		expect(result).toMatchObject({
			code: "RESPONSE_INTERRUPTED",
			message: "The response was interrupted. Please try again.",
		})
	})
})
