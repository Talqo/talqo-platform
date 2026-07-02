import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test"
import type { OpenAPIHono } from "@hono/zod-openapi"
import type { AppVariables } from "@/common/jwt"
import {
	cleanupAdminData,
	cleanupEmails,
	createAdminUser,
	createUniqueEmail,
	registerAndVerify,
} from "@/common/test-utils"

const mockSend = mock(async () => ({ data: { id: "test-id" }, error: null }))

mock.module("resend", () => ({
	Resend: class {
		emails = { send: mockSend }
	},
}))

describe("Analytics integration tests", () => {
	let realApp: OpenAPIHono<{ Variables: AppVariables }>
	const createdClientEmails = new Set<string>()
	const createdAdminEmails = new Set<string>()

	beforeAll(async () => {
		process.env.NODE_ENV ??= "test"
		const mod = await import("@/app")
		realApp = mod.default
	})

	afterAll(async () => {
		await cleanupEmails(Array.from(createdClientEmails))
		await cleanupAdminData(Array.from(createdAdminEmails))
	})

	async function registerClient(email: string, name: string) {
		const token = await registerAndVerify(realApp, email, name)
		createdClientEmails.add(email.toLowerCase())
		return token
	}

	async function createAdmin(email: string) {
		const { token } = await createAdminUser(realApp, email)
		createdAdminEmails.add(email.toLowerCase())
		return token
	}

	// ─── Client analytics ────────────────────────────────────────────────────

	it("GET /client/me/analytics/tokens returns token usage array", async () => {
		const email = createUniqueEmail("analytics-test")
		const token = await registerClient(
			email,
			`Analytics Test ${crypto.randomUUID()}`,
		)

		const res = await realApp.request(
			"/v1/client/me/analytics/tokens?granularity=day",
			{ headers: { Authorization: `Bearer ${token}` } },
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as unknown[]
		expect(Array.isArray(body)).toBe(true)
	})

	it("GET /client/me/analytics/messages returns message count array", async () => {
		const email = createUniqueEmail("analytics-test")
		const token = await registerClient(
			email,
			`Analytics Test ${crypto.randomUUID()}`,
		)

		const res = await realApp.request(
			"/v1/client/me/analytics/messages?granularity=week",
			{ headers: { Authorization: `Bearer ${token}` } },
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as unknown[]
		expect(Array.isArray(body)).toBe(true)
	})

	it("GET /client/me/analytics/summary returns engagement summary", async () => {
		const email = createUniqueEmail("analytics-test")
		const token = await registerClient(
			email,
			`Analytics Test ${crypto.randomUUID()}`,
		)

		const res = await realApp.request("/v1/client/me/analytics/summary", {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			totalConversations: number
			uniqueUsers: number
			totalTokens: number
			totalUserMessages: number
			avgSatisfactionRating: number | null
			totalPageviewSessions: number
			last30DaysSpendUsd: number
		}
		expect(typeof body.totalConversations).toBe("number")
		expect(typeof body.uniqueUsers).toBe("number")
		expect(typeof body.totalTokens).toBe("number")
	})

	it("GET /client/me/analytics/tokens without token returns 401", async () => {
		const res = await realApp.request(
			"/v1/client/me/analytics/tokens?granularity=day",
		)
		expect(res.status).toBe(401)
	})

	// ─── Admin analytics ─────────────────────────────────────────────────────

	it("GET /admin/analytics returns platform stats", async () => {
		const email = createUniqueEmail("analytics-admin-test")
		const token = await createAdmin(email)

		const res = await realApp.request("/v1/admin/analytics", {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			totalTokens: number
			totalCostUsd: number | null
			registeredClients: number
			totalConversations: number
		}
		expect(typeof body.totalTokens).toBe("number")
		expect(typeof body.registeredClients).toBe("number")
	})

	it("GET /admin/analytics/summary returns admin summary", async () => {
		const email = createUniqueEmail("analytics-admin-test")
		const token = await createAdmin(email)

		const res = await realApp.request("/v1/admin/analytics/summary", {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			registeredClients: number
			activeClientsLast30Days: number
			avgSatisfactionRating: number
		}
		expect(typeof body.registeredClients).toBe("number")
		expect(typeof body.activeClientsLast30Days).toBe("number")
		expect(typeof body.avgSatisfactionRating).toBe("number")
	})

	it("GET /admin/analytics/tokens returns platform token usage", async () => {
		const email = createUniqueEmail("analytics-admin-test")
		const token = await createAdmin(email)

		const res = await realApp.request(
			"/v1/admin/analytics/tokens?granularity=day",
			{ headers: { Authorization: `Bearer ${token}` } },
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as unknown[]
		expect(Array.isArray(body)).toBe(true)
	})

	it("GET /admin/analytics/conversations returns platform conversation counts", async () => {
		const email = createUniqueEmail("analytics-admin-test")
		const token = await createAdmin(email)

		const res = await realApp.request(
			"/v1/admin/analytics/conversations?granularity=month",
			{ headers: { Authorization: `Bearer ${token}` } },
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as unknown[]
		expect(Array.isArray(body)).toBe(true)
	})

	it("GET /admin/analytics without token returns 401", async () => {
		const res = await realApp.request("/v1/admin/analytics")
		expect(res.status).toBe(401)
	})

	it("GET /admin/analytics with client token returns 403", async () => {
		const email = createUniqueEmail("analytics-test")
		const clientToken = await registerClient(
			email,
			`Analytics Test ${crypto.randomUUID()}`,
		)
		const res = await realApp.request("/v1/admin/analytics", {
			headers: { Authorization: `Bearer ${clientToken}` },
		})
		expect(res.status).toBe(403)
	})
})
