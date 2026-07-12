import { describe, expect, it, mock } from "bun:test"

// mock.module leaks across test files — keep this shape complete
mock.module("@/db", () => ({
	db: {},
	checkDbConnection: () => Promise.resolve(),
}))

const { default: server } = await import("./index")

describe("GET /health", () => {
	it("returns OK", async () => {
		const res = await server.fetch(new Request("http://localhost/health"))
		const body = await res.json()

		expect(res.status).toBe(200)
		expect(body).toEqual({ message: "OK" })
	})
})

describe("unknown routes", () => {
	it("returns 404", async () => {
		const res = await server.fetch(new Request("http://localhost/unknown"))

		expect(res.status).toBe(404)
	})
})
