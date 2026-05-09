import { beforeEach, describe, expect, it, mock } from "bun:test"
import { OpenAPIHono } from "@hono/zod-openapi"

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock db so widgetAuth resolves token lookups in-memory
let mockClientRow: { id: string; status: "active" | "suspended" } | undefined

mock.module("../../db", () => ({
	db: {
		select: () => ({
			from: () => ({
				where: () => Promise.resolve(mockClientRow ? [mockClientRow] : []),
			}),
		}),
	},
}))

// Provide a WidgetConfigService backed by InMemoryWidgetConfigRepository
const { InMemoryWidgetConfigRepository } = await import(
	"./widget-config.repository"
)
const { WidgetConfigService } = await import("./widget-config.service")

const inMemoryRepo = new InMemoryWidgetConfigRepository()
const widgetConfigService = new WidgetConfigService(inMemoryRepo)

mock.module("../widget-config", () => ({ widgetConfigService }))

// Dynamic imports after mocks
const { widgetConfigRoutes } = await import("../widget/widget.routes")
const { widgetAuth } = await import("../../common/middleware/widget-auth")
const { errorHandler } = await import("../../common/middleware/error-handler")
const { logger } = await import("../../common/logger")

// ─── Test app ─────────────────────────────────────────────────────────────────

function buildApp() {
	const app = new OpenAPIHono()
	app.onError(errorHandler)
	app.use("/*", async (c, next) => {
		c.set(
			"logger" as never,
			logger.withContext({ requestId: crypto.randomUUID() }),
		)
		await next()
	})
	app.use("/*", widgetAuth)
	app.route("/widget", widgetConfigRoutes)
	return app
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /widget/config", () => {
	let app: ReturnType<typeof buildApp>

	beforeEach(() => {
		app = buildApp()
		mockClientRow = undefined
	})

	it("returns 401 when X-Widget-Token header is missing", async () => {
		const res = await app.fetch(new Request("http://localhost/widget/config"))
		expect(res.status).toBe(401)
	})

	it("returns 401 when token is invalid", async () => {
		// mockClientRow undefined → no client found
		const res = await app.fetch(
			new Request("http://localhost/widget/config", {
				headers: { "X-Widget-Token": "bad-token" },
			}),
		)
		expect(res.status).toBe(401)
	})

	it("returns 200 with visual config fields for a valid token", async () => {
		mockClientRow = { id: "client-abc", status: "active" }

		const res = await app.fetch(
			new Request("http://localhost/widget/config", {
				headers: { "X-Widget-Token": "valid-token" },
			}),
		)

		expect(res.status).toBe(200)
		const body = (await res.json()) as Record<string, unknown>
		expect(body).toHaveProperty("botName")
		expect(body).toHaveProperty("position")
		expect(body).toHaveProperty("lightColors")
		expect(body).toHaveProperty("darkColors")
		expect(body).toHaveProperty("icons")
	})

	it("sets Cache-Control header with max-age=3600", async () => {
		mockClientRow = { id: "client-abc", status: "active" }

		const res = await app.fetch(
			new Request("http://localhost/widget/config", {
				headers: { "X-Widget-Token": "valid-token" },
			}),
		)

		expect(res.status).toBe(200)
		const cacheControl = res.headers.get("Cache-Control") ?? ""
		expect(cacheControl).toContain("max-age=3600")
	})

	it("sets Vary: X-Widget-Token header", async () => {
		mockClientRow = { id: "client-abc", status: "active" }

		const res = await app.fetch(
			new Request("http://localhost/widget/config", {
				headers: { "X-Widget-Token": "valid-token" },
			}),
		)

		expect(res.status).toBe(200)
		expect(res.headers.get("Vary")).toBe("X-Widget-Token")
	})
})
