import { describe, expect, it } from "bun:test"
import {
	computeEmbeddingCostUsd,
	computeMessageCostUsd,
	estimateTokens,
	PLATFORM_EMBEDDING_RATE_USD,
	PLATFORM_INPUT_RATE_USD,
	PLATFORM_OUTPUT_RATE_USD,
} from "./billing"

describe("estimateTokens", () => {
	it("returns 0 for empty string", () => {
		expect(estimateTokens("")).toBe(0)
	})

	it("uses ~4 characters per token (ceiling)", () => {
		expect(estimateTokens("a")).toBe(1)
		expect(estimateTokens("abcd")).toBe(1)
		expect(estimateTokens("abcde")).toBe(2)
		expect(estimateTokens("a".repeat(400))).toBe(100)
	})

	it("works for multi-line conversation reconstructions", () => {
		const promptText = [
			"You are a helpful assistant.",
			"Hello",
			"Hi! How can I help?",
			"What is the weather?",
		].join("\n")
		expect(estimateTokens(promptText)).toBeGreaterThan(0)
		expect(estimateTokens(promptText)).toBe(Math.ceil(promptText.length / 4))
	})
})

describe("computeMessageCostUsd", () => {
	it("applies different rates for input and output", () => {
		expect(computeMessageCostUsd({ input: 1_000_000, output: 0 })).toBe(
			PLATFORM_INPUT_RATE_USD * 1_000_000,
		)
		expect(computeMessageCostUsd({ input: 0, output: 1_000_000 })).toBe(
			PLATFORM_OUTPUT_RATE_USD * 1_000_000,
		)
	})

	it("returns 0 cost for zero tokens", () => {
		expect(computeMessageCostUsd({ input: 0, output: 0 })).toBe(0)
	})

	it("sums input and output costs", () => {
		const cost = computeMessageCostUsd({ input: 100, output: 200 })
		const expected =
			100 * PLATFORM_INPUT_RATE_USD + 200 * PLATFORM_OUTPUT_RATE_USD
		expect(cost).toBe(expected)
	})

	it("output rate is higher than input rate (output is more expensive)", () => {
		expect(PLATFORM_OUTPUT_RATE_USD).toBeGreaterThan(PLATFORM_INPUT_RATE_USD)
	})
})

describe("computeEmbeddingCostUsd", () => {
	it("multiplies tokens by the platform embedding rate", () => {
		expect(computeEmbeddingCostUsd(1_000_000)).toBe(
			PLATFORM_EMBEDDING_RATE_USD * 1_000_000,
		)
	})

	it("returns 0 cost for zero tokens", () => {
		expect(computeEmbeddingCostUsd(0)).toBe(0)
	})
})
