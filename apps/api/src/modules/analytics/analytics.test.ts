import { beforeEach, describe, expect, it, mock } from "bun:test"
import { OpenAPIHono } from "@hono/zod-openapi"

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock ./index before dynamic imports so analytics.routes.ts picks up the fake service
const mockService = {
	getTokenAnalytics: mock(
		async () =>
			[] as { period: string; tokensUsed: number; costUsd: string | null }[],
	),
	getMessageAnalytics: mock(
		async () => [] as { period: string; messageCount: number }[],
	),
	getClientSummary: mock(async () => ({
		totalConversations: 0,
		uniqueUsers: 0,
		avgSatisfactionRating: null as number | null,
		totalUserMessages: 0,
		totalTokens: 0,
		totalPageviewSessions: 0,
	})),
	getPlatformStats: mock(async () => ({
		totalTokens: 0,
		totalCostUsd: "0" as string | null,
		activeClients: 0,
		totalConversations: 0,
	})),
}

mock.module("./index", () => ({ analyticsService: mockService }))

// Dynamic imports after mock registration
const { AnalyticsService } = await import("./analytics.service")
const { InMemoryAnalyticsRepository } = await import("./analytics.repository")
const { clientAnalyticsRoutes, adminAnalyticsRoutes } = await import(
	"./analytics.routes"
)
const { errorHandler } = await import("../../common/middleware/error-handler")

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CLIENT_ID = crypto.randomUUID()
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function buildClientApp() {
	const app = new OpenAPIHono()
	app.onError(errorHandler)
	app.use("/*", async (c, next) => {
		c.set("clientId" as never, CLIENT_ID)
		await next()
	})
	return app.route("/analytics", clientAnalyticsRoutes)
}

function buildAdminApp() {
	const app = new OpenAPIHono()
	app.onError(errorHandler)
	return app.route("/analytics", adminAnalyticsRoutes)
}

// ─── AnalyticsService.getTokenAnalytics() ────────────────────────────────────

describe("AnalyticsService.getTokenAnalytics()", () => {
	let repo: InstanceType<typeof InMemoryAnalyticsRepository>
	let service: InstanceType<typeof AnalyticsService>

	beforeEach(() => {
		repo = new InMemoryAnalyticsRepository()
		service = new AnalyticsService(repo as never)
	})

	it("defaults granularity to 'day' when not provided", async () => {
		await service.getTokenAnalytics(CLIENT_ID, {})
		expect(repo.lastTokenUsageArgs?.granularity).toBe("day")
	})

	it("passes through valid granularity values", async () => {
		for (const g of ["day", "week", "month"] as const) {
			await service.getTokenAnalytics(CLIENT_ID, { granularity: g })
			expect(repo.lastTokenUsageArgs?.granularity).toBe(g)
		}
	})

	it("throws ValidationError for invalid granularity", async () => {
		await expect(
			service.getTokenAnalytics(CLIENT_ID, { granularity: "hour" }),
		).rejects.toThrow("granularity must be one of")
	})

	it("defaults to 30-day range when from/to omitted", async () => {
		await service.getTokenAnalytics(CLIENT_ID, {})
		// biome-ignore lint/style/noNonNullAssertion: test accesses internal record state
		const { from, to } = repo.lastTokenUsageArgs!
		expect(to.getTime() - from.getTime()).toBe(THIRTY_DAYS_MS)
	})

	it("parses custom from/to date strings", async () => {
		await service.getTokenAnalytics(CLIENT_ID, {
			from: "2024-01-01",
			to: "2024-01-31",
		})
		expect(repo.lastTokenUsageArgs?.from).toEqual(new Date("2024-01-01"))
		expect(repo.lastTokenUsageArgs?.to).toEqual(new Date("2024-01-31"))
	})

	it("throws ValidationError for invalid 'from' date string", async () => {
		await expect(
			service.getTokenAnalytics(CLIENT_ID, { from: "not-a-date" }),
		).rejects.toThrow("Invalid date")
	})

	it("throws ValidationError for invalid 'to' date string", async () => {
		await expect(
			service.getTokenAnalytics(CLIENT_ID, { to: "not-a-date" }),
		).rejects.toThrow("Invalid date")
	})

	it("passes clientId to the repository", async () => {
		await service.getTokenAnalytics(CLIENT_ID, {})
		expect(repo.lastTokenUsageArgs?.clientId).toBe(CLIENT_ID)
	})

	it("returns data from the repository", async () => {
		repo.tokenUsage = [
			{ period: "2024-01-01", tokensUsed: 42, costUsd: "0.01" },
		]
		const result = await service.getTokenAnalytics(CLIENT_ID, {})
		expect(result).toEqual(repo.tokenUsage)
	})
})

// ─── AnalyticsService.getMessageAnalytics() ──────────────────────────────────

describe("AnalyticsService.getMessageAnalytics()", () => {
	let repo: InstanceType<typeof InMemoryAnalyticsRepository>
	let service: InstanceType<typeof AnalyticsService>

	beforeEach(() => {
		repo = new InMemoryAnalyticsRepository()
		service = new AnalyticsService(repo as never)
	})

	it("throws ValidationError for invalid granularity", async () => {
		await expect(
			service.getMessageAnalytics(CLIENT_ID, { granularity: "year" }),
		).rejects.toThrow("granularity must be one of")
	})

	it("defaults to 30-day range when from/to omitted", async () => {
		await service.getMessageAnalytics(CLIENT_ID, {})
		// biome-ignore lint/style/noNonNullAssertion: test accesses internal record state
		const { from, to } = repo.lastMessageCountArgs!
		expect(to.getTime() - from.getTime()).toBe(THIRTY_DAYS_MS)
	})

	it("passes clientId to the repository", async () => {
		await service.getMessageAnalytics(CLIENT_ID, {})
		expect(repo.lastMessageCountArgs?.clientId).toBe(CLIENT_ID)
	})

	it("returns data from the repository", async () => {
		repo.messageCounts = [{ period: "2024-01-01", messageCount: 7 }]
		const result = await service.getMessageAnalytics(CLIENT_ID, {})
		expect(result).toEqual(repo.messageCounts)
	})
})

// ─── AnalyticsService.getClientSummary() ─────────────────────────────────────

describe("AnalyticsService.getClientSummary()", () => {
	let repo: InstanceType<typeof InMemoryAnalyticsRepository>
	let service: InstanceType<typeof AnalyticsService>

	beforeEach(() => {
		repo = new InMemoryAnalyticsRepository()
		service = new AnalyticsService(repo as never)
	})

	it("passes clientId to the repository", async () => {
		await service.getClientSummary(CLIENT_ID)
		expect(repo.lastClientSummaryClientId).toBe(CLIENT_ID)
	})

	it("returns the repository result unchanged", async () => {
		repo.clientSummary = {
			totalConversations: 10,
			uniqueUsers: 5,
			avgSatisfactionRating: 4.2,
			totalUserMessages: 30,
			totalTokens: 1500,
			totalPageviewSessions: 8,
		}
		const result = await service.getClientSummary(CLIENT_ID)
		expect(result).toEqual(repo.clientSummary)
	})
})

// ─── AnalyticsService.getPlatformStats() ─────────────────────────────────────

describe("AnalyticsService.getPlatformStats()", () => {
	let repo: InstanceType<typeof InMemoryAnalyticsRepository>
	let service: InstanceType<typeof AnalyticsService>

	beforeEach(() => {
		repo = new InMemoryAnalyticsRepository()
		service = new AnalyticsService(repo as never)
	})

	it("returns the repository result unchanged", async () => {
		repo.platformStats = {
			totalTokens: 99999,
			totalCostUsd: "12.34",
			activeClients: 7,
			totalConversations: 200,
		}
		const result = await service.getPlatformStats()
		expect(result).toEqual(repo.platformStats)
	})
})

// ─── GET /analytics/tokens ────────────────────────────────────────────────────

describe("GET /analytics/tokens", () => {
	let app: ReturnType<typeof buildClientApp>

	beforeEach(() => {
		app = buildClientApp()
		mockService.getTokenAnalytics.mockClear()
		mockService.getTokenAnalytics.mockImplementation(async () => [
			{ period: "2024-01-01T00:00:00.000Z", tokensUsed: 100, costUsd: "0.05" },
		])
	})

	it("returns 200 with token usage data", async () => {
		const res = await app.fetch(
			new Request("http://localhost/analytics/tokens"),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { period: string; tokensUsed: number }[]
		expect(Array.isArray(body)).toBe(true)
		expect(body[0].tokensUsed).toBe(100)
	})

	it("passes clientId from context to service", async () => {
		await app.fetch(new Request("http://localhost/analytics/tokens"))
		expect(mockService.getTokenAnalytics.mock.calls[0]?.[0]).toBe(CLIENT_ID)
	})

	it("returns 400 for invalid granularity query param", async () => {
		const res = await app.fetch(
			new Request("http://localhost/analytics/tokens?granularity=hour"),
		)
		expect(res.status).toBe(400)
	})

	it("returns 422 for invalid date query param", async () => {
		mockService.getTokenAnalytics.mockImplementation(async () => {
			const { ValidationError } = await import("../../common/errors")
			throw new ValidationError("Invalid date: not-a-date")
		})
		const res = await app.fetch(
			new Request("http://localhost/analytics/tokens?from=not-a-date"),
		)
		expect(res.status).toBe(422)
	})
})

// ─── GET /analytics/messages ──────────────────────────────────────────────────

describe("GET /analytics/messages", () => {
	let app: ReturnType<typeof buildClientApp>

	beforeEach(() => {
		app = buildClientApp()
		mockService.getMessageAnalytics.mockClear()
		mockService.getMessageAnalytics.mockImplementation(async () => [
			{ period: "2024-01-01T00:00:00.000Z", messageCount: 5 },
		])
	})

	it("returns 200 with message count data", async () => {
		const res = await app.fetch(
			new Request("http://localhost/analytics/messages"),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			period: string
			messageCount: number
		}[]
		expect(Array.isArray(body)).toBe(true)
		expect(body[0].messageCount).toBe(5)
	})

	it("returns 400 for invalid granularity query param", async () => {
		const res = await app.fetch(
			new Request("http://localhost/analytics/messages?granularity=year"),
		)
		expect(res.status).toBe(400)
	})
})

// ─── GET /analytics/summary ───────────────────────────────────────────────────

describe("GET /analytics/summary", () => {
	let app: ReturnType<typeof buildClientApp>

	beforeEach(() => {
		app = buildClientApp()
		mockService.getClientSummary.mockClear()
		mockService.getClientSummary.mockImplementation(async () => ({
			totalConversations: 10,
			uniqueUsers: 4,
			avgSatisfactionRating: 3.5,
			totalUserMessages: 20,
			totalTokens: 500,
			totalPageviewSessions: 6,
		}))
	})

	it("returns 200 with summary object", async () => {
		const res = await app.fetch(
			new Request("http://localhost/analytics/summary"),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			totalConversations: number
			uniqueUsers: number
			avgSatisfactionRating: number | null
		}
		expect(body.totalConversations).toBe(10)
		expect(body.uniqueUsers).toBe(4)
		expect(body.avgSatisfactionRating).toBe(3.5)
	})

	it("passes clientId from context to service", async () => {
		await app.fetch(new Request("http://localhost/analytics/summary"))
		expect(mockService.getClientSummary.mock.calls[0]?.[0]).toBe(CLIENT_ID)
	})
})

// ─── GET /analytics/ (admin) ──────────────────────────────────────────────────

describe("GET /analytics/ (admin)", () => {
	let app: ReturnType<typeof buildAdminApp>

	beforeEach(() => {
		app = buildAdminApp()
		mockService.getPlatformStats.mockClear()
		mockService.getPlatformStats.mockImplementation(async () => ({
			totalTokens: 50000,
			totalCostUsd: "25.00",
			activeClients: 3,
			totalConversations: 150,
		}))
	})

	it("returns 200 with platform stats", async () => {
		const res = await app.fetch(new Request("http://localhost/analytics"))
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			totalTokens: number
			activeClients: number
		}
		expect(body.totalTokens).toBe(50000)
		expect(body.activeClients).toBe(3)
	})
})
