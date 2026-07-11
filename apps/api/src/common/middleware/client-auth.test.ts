import { beforeEach, describe, expect, it, mock } from "bun:test"
import { Hono } from "hono"
import { UnauthorizedError } from "@/common/errors"
import type { AppVariables, TokenPayload } from "@/common/jwt"
import { logger } from "@/common/logger"

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Controlled DB state — set in each test
let mockClientRow:
	| { id: string; status: string; tokenVersion?: number }
	| undefined

mock.module("@/db", () => ({
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

mock.module("@/common/jwt", () => ({
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
	const app = new Hono<{ Variables: AppVariables }>()
	app.onError(errorHandler)
	app.use("/*", async (c, next) => {
		c.set("logger", logger.withContext({ requestId: crypto.randomUUID() }))
		await next()
	})
	app.use("/*", clientAuth)
	app.get("/protected", (c) => c.json({ clientId: c.get("clientId") }))
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

	it("allows impersonation of a suspended client (admin support access)", async () => {
		const clientId = crypto.randomUUID()
		mockVerifyResult = { sub: clientId, role: "client", imp: true }
		mockClientRow = { id: clientId, status: "suspended" }
		const res = await app.fetch(
			new Request("http://localhost/protected", {
				headers: bearer("valid.impersonation.token"),
			}),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { clientId: string }
		expect(body.clientId).toBe(clientId)
	})

	it("returns 401 when the token's tokenVersion is stale (e.g. after a password reset)", async () => {
		const clientId = crypto.randomUUID()
		mockVerifyResult = { sub: clientId, role: "client", tokenVersion: 0 }
		mockClientRow = { id: clientId, status: "active", tokenVersion: 1 }
		const res = await app.fetch(
			new Request("http://localhost/protected", {
				headers: bearer("stale.client.token"),
			}),
		)
		expect(res.status).toBe(401)
	})

	it("passes for a legacy token with no tokenVersion claim (pre-migration JWT)", async () => {
		const clientId = crypto.randomUUID()
		mockVerifyResult = { sub: clientId, role: "client" }
		mockClientRow = { id: clientId, status: "active", tokenVersion: 0 }
		const res = await app.fetch(
			new Request("http://localhost/protected", {
				headers: bearer("legacy.client.token"),
			}),
		)
		expect(res.status).toBe(200)
	})

	it("passes when the token's tokenVersion matches the current value", async () => {
		const clientId = crypto.randomUUID()
		mockVerifyResult = { sub: clientId, role: "client", tokenVersion: 2 }
		mockClientRow = { id: clientId, status: "active", tokenVersion: 2 }
		const res = await app.fetch(
			new Request("http://localhost/protected", {
				headers: bearer("current.client.token"),
			}),
		)
		expect(res.status).toBe(200)
	})
})
