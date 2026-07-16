import { describe, expect, it } from "bun:test"
import { toUserFriendlyError } from "./errors"

describe("toUserFriendlyError", () => {
	it("maps provider rate limits by stable code", () => {
		expect(
			toUserFriendlyError({ code: "AI_RATE_LIMITED", message: "hidden" }),
		).toBe("The chat service is busy. Please wait a moment and try again.")
	})

	it("maps interrupted responses by stable code", () => {
		expect(
			toUserFriendlyError({ code: "RESPONSE_INTERRUPTED", message: "hidden" }),
		).toBe("The response was interrupted. Please try again.")
	})

	it("maps account limits by stable code", () => {
		expect(
			toUserFriendlyError({
				code: "MONTHLY_LIMIT_REACHED",
				message: "hidden",
			}),
		).toBe("This chat has reached its usage limit. Please try again later.")
	})
})
