import { beforeEach, describe, expect, it, mock } from "bun:test"
import { OpenAPIHono } from "@hono/zod-openapi"
import type { AppVariables } from "@/common/jwt"
import { logger } from "@/common/logger"
import {
	InMemoryWidgetConfigRepository,
	type WidgetConfigData,
} from "./widget-config.repository"
import { WidgetConfigService } from "./widget-config.service"

// ─── Unit tests ───────────────────────────────────────────────────────────────

function makeService() {
	const repo = new InMemoryWidgetConfigRepository()
	const service = new WidgetConfigService(repo)
	return { repo, service }
}

const sampleColors = {
	primary: "hsl(0 0% 50%)",
	bgPrimary: "#ffffff",
	bgSecondary: "#f3f4f6",
	textPrimary: "#111827",
	textSecondary: "#6b7280",
	border: "#e5e7eb",
	headerTitleText: "#ffffff",
	userMessageText: "#ffffff",
	sendButtonIcon: "#ffffff",
	footerText: "#9ca3af",
}

const sampleData: WidgetConfigData = {
	botName: "TestBot",
	position: "left",
	lightColors: sampleColors,
	darkColors: sampleColors,
	icons: { botAvatar: "star" },
}

describe("WidgetConfigService", () => {
	describe("getConfig", () => {
		it("returns defaults when no row exists", async () => {
			const { service } = makeService()
			const config = await service.getConfig("client-1")

			expect(config.botName).toBe("AI Assistant")
			expect(config.position).toBe("right")
			expect(config.lightColors.primary).toBe("#16a34a")
			expect(config.icons.botAvatar).toBe("bot")
		})

		it("returns saved row after saveConfig", async () => {
			const { service } = makeService()
			await service.saveConfig("client-1", sampleData)

			const config = await service.getConfig("client-1")

			expect(config.botName).toBe("TestBot")
			expect(config.position).toBe("left")
			expect(config.lightColors.primary).toBe(sampleColors.primary)
		})
	})

	describe("saveConfig", () => {
		it("upserts and returns WidgetVisualConfig with correct fields", async () => {
			const { service } = makeService()
			const result = await service.saveConfig("client-2", sampleData)

			expect(result.botName).toBe("TestBot")
			expect(result.position).toBe("left")
			expect(result.lightColors).toEqual(sampleData.lightColors)
			expect(result.darkColors).toEqual(sampleData.darkColors)
			expect(result.icons).toEqual(sampleData.icons)
		})

		it("second call overwrites first (idempotent upsert)", async () => {
			const { service } = makeService()
			await service.saveConfig("client-3", sampleData)

			const updated: WidgetConfigData = {
				...sampleData,
				botName: "UpdatedBot",
				position: "right",
			}
			const result = await service.saveConfig("client-3", updated)

			expect(result.botName).toBe("UpdatedBot")
			expect(result.position).toBe("right")

			const fetched = await service.getConfig("client-3")
			expect(fetched.botName).toBe("UpdatedBot")
		})
	})
})

// ─── Route integration tests ──────────────────────────────────────────────────

const CLIENT_ID = crypto.randomUUID()

// eslint-disable-next-line -- toggled per test
const authState = { reject: false }

// Wire an in-memory WidgetConfigService so tests are isolated from real DB
const inMemoryRepo = new InMemoryWidgetConfigRepository()
const inMemoryWidgetConfigService = new WidgetConfigService(inMemoryRepo)

mock.module("./index", () => ({
	widgetConfigService: inMemoryWidgetConfigService,
}))

// Dynamic imports after mocks so modules pick up the fakes
const { clientWidgetConfigRoutes } = await import(
	"./widget-config.client.routes"
)
const { errorHandler } = await import("@/common/middleware/error-handler")

function buildApp() {
	const app = new OpenAPIHono<{ Variables: AppVariables }>()
	app.onError(errorHandler)
	app.use("/*", async (c, next) => {
		c.set("logger", logger.withContext({ requestId: crypto.randomUUID() }))
		if (authState.reject) {
			const { UnauthorizedError } = await import("@/common/errors")
			throw new UnauthorizedError("Missing or invalid Authorization header")
		}
		c.set("clientId", CLIENT_ID)
		await next()
	})
	app.route("/client/me/widget-config", clientWidgetConfigRoutes)
	return app
}

const validBody = {
	botName: "RouteBot",
	position: "left",
	lightColors: {
		primary: "hsl(0 0% 10%)",
		bgPrimary: "#fff",
		bgSecondary: "#eee",
		textPrimary: "#000",
		textSecondary: "#666",
		border: "#ccc",
		headerTitleText: "#fff",
		userMessageText: "#fff",
		sendButtonIcon: "#fff",
		footerText: "#ffffff",
	},
	darkColors: {
		primary: "hsl(0 0% 20%)",
		bgPrimary: "#111",
		bgSecondary: "#222",
		textPrimary: "#fff",
		textSecondary: "#aaa",
		border: "#333",
		headerTitleText: "#fff",
		userMessageText: "#fff",
		sendButtonIcon: "#fff",
		footerText: "#ffffff",
	},
	icons: { botAvatar: "star" },
}

describe("GET /client/me/widget-config", () => {
	let app: ReturnType<typeof buildApp>

	beforeEach(() => {
		authState.reject = false
		app = buildApp()
	})

	it("returns 200 with default config fields when no config saved", async () => {
		const res = await app.fetch(
			new Request("http://localhost/client/me/widget-config"),
		)

		expect(res.status).toBe(200)
		const body = (await res.json()) as Record<string, unknown>
		expect(body).toHaveProperty("botName")
		expect(body).toHaveProperty("position")
		expect(body).toHaveProperty("lightColors")
		expect(body).toHaveProperty("darkColors")
		expect(body).toHaveProperty("icons")
	})

	it("returns 401 when auth rejects the request", async () => {
		authState.reject = true
		const res = await app.fetch(
			new Request("http://localhost/client/me/widget-config"),
		)
		expect(res.status).toBe(401)
	})
})

describe("PUT /client/me/widget-config", () => {
	let app: ReturnType<typeof buildApp>

	beforeEach(() => {
		authState.reject = false
		app = buildApp()
	})

	it("returns 200 with saved config on valid body", async () => {
		const res = await app.fetch(
			new Request("http://localhost/client/me/widget-config", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validBody),
			}),
		)

		expect(res.status).toBe(200)
		const body = (await res.json()) as Record<string, unknown>
		expect(body).toHaveProperty("botName", "RouteBot")
		expect(body).toHaveProperty("position", "left")
		expect(body).toHaveProperty("lightColors")
		expect(body).toHaveProperty("darkColors")
		expect(body).toHaveProperty("icons")
	})

	it("GET after PUT returns the saved values", async () => {
		await app.fetch(
			new Request("http://localhost/client/me/widget-config", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validBody),
			}),
		)

		const getRes = await app.fetch(
			new Request("http://localhost/client/me/widget-config"),
		)

		expect(getRes.status).toBe(200)
		const body = (await getRes.json()) as Record<string, unknown>
		expect(body).toHaveProperty("botName", "RouteBot")
		expect(body).toHaveProperty("position", "left")
	})

	it("returns 400 when required fields are missing", async () => {
		const res = await app.fetch(
			new Request("http://localhost/client/me/widget-config", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ botName: "OnlyName" }),
			}),
		)

		expect(res.status).toBe(400)
	})

	it("returns 401 when auth rejects the request", async () => {
		authState.reject = true
		const res = await app.fetch(
			new Request("http://localhost/client/me/widget-config", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validBody),
			}),
		)
		expect(res.status).toBe(401)
	})
})
