import { describe, expect, it } from "bun:test"
import app from "./app"

describe("App smoke tests", () => {
	it("GET /health returns OK", async () => {
		const res = await app.request("/health")
		expect(res.status).toBe(200)
		const json = await res.json()
		expect(json.message).toBe("OK")
	})

	it("GET / returns Talqo API", async () => {
		const res = await app.request("/")
		expect(res.status).toBe(200)
		const text = await res.text()
		expect(text).toBe("Talqo API")
	})
})
