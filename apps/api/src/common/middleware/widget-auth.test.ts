import { beforeEach, describe, expect, it, mock } from "bun:test"
import { eq } from "drizzle-orm"
import { Hono } from "hono"
import type { AppVariables } from "@/common/jwt"
import { clients } from "@/db/schema"

// ─── Mocks ────────────────────────────────────────────────────────────────────

let mockClientRow: { id: string; status: "active" | "suspended" } | undefined
let capturedWhereArg: unknown

// mock.module leaks across test files — keep this shape complete
mock.module("@/db", () => ({
	db: {
		select: () => ({
			from: () => ({
				where: (sqlExpr: unknown) => {
					capturedWhereArg = sqlExpr
					return Promise.resolve(mockClientRow ? [mockClientRow] : [])
				},
			}),
		}),
	},
	checkDbConnection: () => Promise.resolve(),
}))

const { widgetAuth } = await import("./widget-auth")
const { errorHandler } = await import("./error-handler")

// ─── Test app ─────────────────────────────────────────────────────────────────

function buildApp() {
	const app = new Hono<{ Variables: AppVariables }>()
	app.onError(errorHandler)
	app.use("/*", widgetAuth)
	app.get("/widget", (c) => c.json({ clientId: c.get("clientId") }))
	return app
}

function withToken(token: string) {
	return { "X-Widget-Token": token }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("widgetAuth middleware", () => {
	let app: Hono

	beforeEach(() => {
		app = buildApp()
		mockClientRow = undefined
		capturedWhereArg = undefined
	})

	it("returns 401 when X-Widget-Token header is missing", async () => {
		const res = await app.fetch(new Request("http://localhost/widget"))
		expect(res.status).toBe(401)
	})

	it("returns 401 when token does not match any client", async () => {
		// mockClientRow undefined → mock returns []
		const res = await app.fetch(
			new Request("http://localhost/widget", {
				headers: withToken("unknown-token"),
			}),
		)
		expect(res.status).toBe(401)
	})

	it("passes and sets clientId in context for a valid active client", async () => {
		const clientId = crypto.randomUUID()
		mockClientRow = { id: clientId, status: "active" }
		const res = await app.fetch(
			new Request("http://localhost/widget", {
				headers: withToken(crypto.randomUUID()),
			}),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { clientId: string }
		expect(body.clientId).toBe(clientId)
	})

	it("returns 401 when client account is suspended", async () => {
		mockClientRow = { id: crypto.randomUUID(), status: "suspended" }
		const res = await app.fetch(
			new Request("http://localhost/widget", {
				headers: withToken(crypto.randomUUID()),
			}),
		)
		expect(res.status).toBe(401)
	})

	it("queries by the token passed in the header", async () => {
		const token = crypto.randomUUID()
		mockClientRow = { id: crypto.randomUUID(), status: "active" }
		await app.fetch(
			new Request("http://localhost/widget", {
				headers: withToken(token),
			}),
		)
		expect(capturedWhereArg).toEqual(eq(clients.widgetToken, token))
	})
})
