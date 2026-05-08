import { describe, expect, test } from "bun:test"
import { shouldShowRatingPrompt } from "./ratingTrigger"

describe("shouldShowRatingPrompt", () => {
	test("returns false when there are no user messages", () => {
		const messages = [{ role: "assistant" }, { role: "assistant" }]
		expect(shouldShowRatingPrompt(messages as any, false)).toBe(false)
	})

	test("returns false when there is a user message but no assistant response yet", () => {
		const messages = [{ role: "user" }]
		expect(shouldShowRatingPrompt(messages as any, false)).toBe(false)
	})

	test("returns true after at least one user message and one assistant response", () => {
		const messages = [
			{ role: "assistant", content: "Hi!" },
			{ role: "user", content: "Hello" },
			{ role: "assistant", content: "How can I help?" },
		]
		expect(shouldShowRatingPrompt(messages as any, false)).toBe(true)
	})

	test("returns false when rating has already been submitted", () => {
		const messages = [{ role: "user" }, { role: "assistant" }]
		expect(shouldShowRatingPrompt(messages as any, true)).toBe(false)
	})

	test("returns false for welcome-only conversation", () => {
		const messages = [
			{ role: "assistant", content: "Hi! How can I help you today?" },
		]
		expect(shouldShowRatingPrompt(messages as any, false)).toBe(false)
	})
})
