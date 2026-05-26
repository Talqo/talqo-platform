/**
 * Centralized billing logic: token pricing and a fallback estimator
 * for providers that don't report usage.
 *
 * Three independent rates:
 *   - LLM input tokens (system prompt + history + new message)
 *   - LLM output tokens (model completion)
 *   - Embedding tokens (per embedding model)
 *
 * When a provider returns no usage, we estimate from the raw text using
 * the standard ~4-characters-per-token heuristic. It slightly overestimates
 * to avoid undercharging.
 */

export const PLATFORM_INPUT_RATE_USD = 1 / 1_000_000
export const PLATFORM_OUTPUT_RATE_USD = 2 / 1_000_000
export const PLATFORM_EMBEDDING_RATE_USD = 0.2 / 1_000_000

const CHARS_PER_TOKEN = 4

export function estimateTokens(text: string): number {
	if (text.length === 0) return 0
	return Math.ceil(text.length / CHARS_PER_TOKEN)
}

export function computeMessageCostUsd(tokens: {
	input: number
	output: number
}): number {
	if (tokens.input < 0 || tokens.output < 0) {
		throw new RangeError("Token counts must be non-negative")
	}
	return (
		tokens.input * PLATFORM_INPUT_RATE_USD +
		tokens.output * PLATFORM_OUTPUT_RATE_USD
	)
}

export function computeEmbeddingCostUsd(tokens: number): number {
	if (tokens < 0) {
		throw new RangeError("Token count must be non-negative")
	}
	return tokens * PLATFORM_EMBEDDING_RATE_USD
}
