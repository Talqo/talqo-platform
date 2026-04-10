import { beforeEach, describe, expect, it, mock } from "bun:test"
import { Hono } from "hono"
import { UnauthorizedError } from "../errors"
import type { TokenPayload } from "../jwt"

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Controlled DB state — set in each test
let mockClientRow: { id: string; status: string } | undefined

mock.module("../../db", () => ({
	db: {
		select: () => ({
			from: () => ({
				where: () => Promise.resolve(mockClientRow ? [mockClientRow] : []),
			}),
		}),
	},
}))

// Controlled JWT verification — set in each test
let mockVerifyResult: TokenPayload | null = null

mock.module("../jwt", () => ({
	signToken: async () => "mock-token",
	verifyToken: async (_token: string) => {
		if (!mockVerifyResult)
			throw new UnauthorizedError("Invalid or expired token")
		return mockVerifyResult
	},
}))

// Dynamically import after mocks are registered
const { clientAuth } = await import("./client-auth")
const { errorHandler } = await import("./error-handler")

// ─── Test app ─────────────────────────────────────────────────────────────────

function buildApp() {
	const app = new Hono()
	app.onError(errorHandler)
	app.use("/*", clientAuth)
	app.get("/protected", (c) => c.json({ clientId: c.get("clientId" as never) }))
	return app
}

function bearer(token: string) {
	return { Authorization: `Bearer ${token}` }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("clientAuth middleware", () => {
	let app: Hono

	beforeEach(() => {
		app = buildApp()
		mockClientRow = undefined
		mockVerifyResult = null
	})

	it("returns 401 when Authorization header is missing", async () => {
		const res = await app.fetch(new Request("http://localhost/protected"))
		expect(res.status).toBe(401)
	})

	it("returns 401 when Authorization header is malformed", async () => {
		const res = await app.fetch(
			new Request("http://localhost/protected", {
				headers: { Authorization: "Token abc" },
			}),
		)
		expect(res.status).toBe(401)
	})

	it("returns 401 when token is invalid or expired", async () => {
		mockVerifyResult = null // verifyToken will throw
		const res = await app.fetch(
			new Request("http://localhost/protected", {
				headers: bearer("invalid.token.here"),
			}),
		)
		expect(res.status).toBe(401)
	})

	it("returns 403 when a valid admin token is used on a client route", async () => {
		mockVerifyResult = { sub: "admin-id", role: "admin" }
		const res = await app.fetch(
			new Request("http://localhost/protected", {
				headers: bearer("valid.admin.token"),
			}),
		)
		expect(res.status).toBe(403)
	})

	it("returns 401 when client is not found in the DB", async () => {
		mockVerifyResult = { sub: "unknown-client-id", role: "client" }
		mockClientRow = undefined
		const res = await app.fetch(
			new Request("http://localhost/protected", {
				headers: bearer("valid.client.token"),
			}),
		)
		expect(res.status).toBe(401)
	})

	it("returns 401 when the client account is suspended", async () => {
		const clientId = crypto.randomUUID()
		mockVerifyResult = { sub: clientId, role: "client" }
		mockClientRow = { id: clientId, status: "suspended" }
		const res = await app.fetch(
			new Request("http://localhost/protected", {
				headers: bearer("valid.client.token"),
			}),
		)
		expect(res.status).toBe(401)
	})

	it("passes and sets clientId in context for a valid client token", async () => {
		const clientId = crypto.randomUUID()
		mockVerifyResult = { sub: clientId, role: "client" }
		mockClientRow = { id: clientId, status: "active" }
		const res = await app.fetch(
			new Request("http://localhost/protected", {
				headers: bearer("valid.client.token"),
			}),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { clientId: string }
		expect(body.clientId).toBe(clientId)
	})

	it("accepts an impersonation token (imp: true) issued by admin", async () => {
		const clientId = crypto.randomUUID()
		// Impersonation tokens have role "client" and imp: true
		mockVerifyResult = { sub: clientId, role: "client", imp: true }
		mockClientRow = { id: clientId, status: "active" }
		const res = await app.fetch(
			new Request("http://localhost/protected", {
				headers: bearer("valid.impersonation.token"),
			}),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { clientId: string }
		expect(body.clientId).toBe(clientId)
	})
})
