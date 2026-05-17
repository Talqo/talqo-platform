import { beforeEach, describe, expect, it, mock } from "bun:test"
import { Hono } from "hono"
import { UnauthorizedError } from "@/common/errors"
import type { AppVariables, TokenPayload } from "@/common/jwt"

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Controlled DB state — set in each test
let mockAdminRow: { id: string } | undefined
let auditLogInserted: unknown

mock.module("@/db", () => ({
	db: {
		select: () => ({
			from: () => ({
				where: () => Promise.resolve(mockAdminRow ? [mockAdminRow] : []),
			}),
		}),
		insert: () => ({
			values: async (data: unknown) => {
				auditLogInserted = data
			},
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
const { adminAuth } = await import("./admin-auth")
const { adminAuditLog } = await import("./admin-audit-log")
const { errorHandler } = await import("./error-handler")

// ─── Test app ─────────────────────────────────────────────────────────────────

function buildApp() {
	const app = new Hono<{ Variables: AppVariables }>()
	app.onError(errorHandler)
	app.use("/*", adminAuth)
	app.get("/protected", (c) => c.json({ adminId: c.get("adminId") }))
	return app
}

function bearer(token: string) {
	return { Authorization: `Bearer ${token}` }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("adminAuth middleware", () => {
	let app: Hono

	beforeEach(() => {
		app = buildApp()
		mockAdminRow = undefined
		mockVerifyResult = null
		auditLogInserted = undefined
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

	it("returns 403 when a valid client token is used on an admin route", async () => {
		mockVerifyResult = { sub: "client-id", role: "client" }
		const res = await app.fetch(
			new Request("http://localhost/protected", {
				headers: bearer("valid.client.token"),
			}),
		)
		expect(res.status).toBe(403)
	})

	it("returns 401 when admin is not found in the DB (e.g. soft-deleted)", async () => {
		mockVerifyResult = { sub: "deleted-admin-id", role: "admin" }
		mockAdminRow = undefined // no row returned — admin is soft-deleted or removed
		const res = await app.fetch(
			new Request("http://localhost/protected", {
				headers: bearer("valid.admin.token"),
			}),
		)
		expect(res.status).toBe(401)
	})

	it("passes and sets adminId in context for a valid admin token", async () => {
		const adminId = crypto.randomUUID()
		mockVerifyResult = { sub: adminId, role: "admin" }
		mockAdminRow = { id: adminId }
		const res = await app.fetch(
			new Request("http://localhost/protected", {
				headers: bearer("valid.admin.token"),
			}),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { adminId: string }
		expect(body.adminId).toBe(adminId)
	})

	it("writes an audit log for mutating requests (POST)", async () => {
		const adminId = crypto.randomUUID()
		const clientId = crypto.randomUUID()
		mockVerifyResult = { sub: adminId, role: "admin" }
		mockAdminRow = { id: adminId }

		const app = new Hono()
		app.use("/*", adminAuth)
		app.use("/*", adminAuditLog)
		app.post("/admin/clients/:clientId/status", (c) => c.json({ ok: true }))

		await app.fetch(
			new Request(`http://localhost/admin/clients/${clientId}/status`, {
				method: "POST",
				headers: bearer("valid.admin.token"),
			}),
		)

		expect(auditLogInserted).toMatchObject({ adminId, clientId })
	})

	it("does not write an audit log for read-only requests (GET)", async () => {
		const adminId = crypto.randomUUID()
		mockVerifyResult = { sub: adminId, role: "admin" }
		mockAdminRow = { id: adminId }
		await app.fetch(
			new Request("http://localhost/protected", {
				headers: bearer("valid.admin.token"),
			}),
		)
		expect(auditLogInserted).toBeUndefined()
	})
})
