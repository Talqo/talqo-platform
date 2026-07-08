import { describe, expect, it, mock } from "bun:test"

// Controlled DB probe result — set in each test
let mockExecute: () => Promise<unknown> = () => Promise.resolve()

mock.module("@/db", () => ({
	db: { execute: () => mockExecute() },
}))

// Dynamic import after the mock is registered
const { default: app } = await import("./app")

describe("App smoke tests", () => {
	it("GET /health returns OK when the database is reachable", async () => {
		mockExecute = () => Promise.resolve()
		const res = await app.request("/health")
		expect(res.status).toBe(200)
		const json = await res.json()
		expect(json.message).toBe("OK")
	})

	it("GET /health returns 503 when the database is unreachable", async () => {
		mockExecute = () => Promise.reject(new Error("connection refused"))
		const res = await app.request("/health")
		expect(res.status).toBe(503)
	})

	it("GET / returns Talqo API", async () => {
		const res = await app.request("/")
		expect(res.status).toBe(200)
		const text = await res.text()
		expect(text).toBe("Talqo API")
	})
})

describe("Body size limits", () => {
	// hono's bodyLimit short-circuits on the Content-Length header when present
	// (the fast path real HTTP clients hit) rather than counting streamed bytes,
	// so these tests set it explicitly to exercise that path deterministically.
	it("rejects a JSON body over the 1 MB default cap with 413", async () => {
		const bigBody = JSON.stringify({ email: "a".repeat(2 * 1024 * 1024) })
		const res = await app.request("/v1/auth/forgot-password", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Content-Length": String(bigBody.length),
			},
			body: bigBody,
		})
		expect(res.status).toBe(413)
		const json = (await res.json()) as { error: { code: string } }
		expect(json.error.code).toBe("PAYLOAD_TOO_LARGE")
	})

	it("allows a body over 1 MB (but under 20 MB) on the file upload route", async () => {
		const bytes = new Uint8Array(5 * 1024 * 1024)
		const res = await app.request("/v1/client/me/files", {
			method: "POST",
			headers: { "Content-Length": String(bytes.length) },
			body: bytes,
		})
		// No auth token supplied — the point is this must NOT be 413 (body-limit
		// layer), it should reach auth and fail there instead.
		expect(res.status).not.toBe(413)
	})

	it("rejects a body over the 20 MB file-upload cap with 413", async () => {
		const bytes = new Uint8Array(21 * 1024 * 1024)
		const res = await app.request("/v1/client/me/files", {
			method: "POST",
			headers: { "Content-Length": String(bytes.length) },
			body: bytes,
		})
		expect(res.status).toBe(413)
	})

	it("applies the 1 MB default cap to a route that merely shares the /files prefix", async () => {
		const bytes = new Uint8Array(2 * 1024 * 1024)
		const res = await app.request("/v1/client/me/filesharing", {
			method: "POST",
			headers: { "Content-Length": String(bytes.length) },
			body: bytes,
		})
		expect(res.status).toBe(413)
	})
})
