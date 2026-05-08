import { describe, expect, test } from "bun:test"
import { shouldShowRatingPrompt } from "./ratingTrigger"

describe("shouldShowRatingPrompt", () => {
	test("returns false when there are no user messages", () => {
		const messages = [
			{ id: "1", role: "assistant" as const, content: "Hi!" },
			{ id: "2", role: "assistant" as const, content: "" },
		]
		expect(shouldShowRatingPrompt(messages, false)).toBe(false)
	})

	test("returns false when there is a user message but no assistant response yet", () => {
		const messages = [{ id: "1", role: "user" as const, content: "Hello" }]
		expect(shouldShowRatingPrompt(messages, false)).toBe(false)
	})

	test("returns true after at least one user message and one assistant response", () => {
		const messages = [
			{ id: "1", role: "assistant" as const, content: "Hi!" },
			{ id: "2", role: "user" as const, content: "Hello" },
			{ id: "3", role: "assistant" as const, content: "How can I help?" },
		]
		expect(shouldShowRatingPrompt(messages, false)).toBe(true)
	})

	test("returns false when rating has already been submitted", () => {
		const messages = [
			{ id: "1", role: "user" as const, content: "Hello" },
			{ id: "2", role: "assistant" as const, content: "Hi!" },
		]
		expect(shouldShowRatingPrompt(messages, true)).toBe(false)
	})

	test("returns false for welcome-only conversation", () => {
		const messages = [
			{
				id: "1",
				role: "assistant" as const,
				content: "Hi! How can I help you today?",
			},
		]
		expect(shouldShowRatingPrompt(messages, false)).toBe(false)
	})
})
