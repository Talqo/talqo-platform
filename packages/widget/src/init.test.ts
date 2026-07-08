import { afterEach, describe, expect, it } from "bun:test"
import { isCurrentTalqoToken } from "./main"

const testGlobal = globalThis as typeof globalThis & {
	window?: { __TALQO__?: { token: string } }
}

describe("widget init guards", () => {
	afterEach(() => {
		delete testGlobal.window
	})

	it("allows init to continue while the configured token is unchanged", () => {
		testGlobal.window = { __TALQO__: { token: "token-a" } }

		expect(isCurrentTalqoToken("token-a")).toBe(true)
	})

	it("stops init when host page removed the token during async startup", () => {
		testGlobal.window = { __TALQO__: { token: "token-a" } }
		delete testGlobal.window.__TALQO__

		expect(isCurrentTalqoToken("token-a")).toBe(false)
	})
})
