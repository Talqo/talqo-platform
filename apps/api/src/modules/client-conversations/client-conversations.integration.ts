import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test"
import type { OpenAPIHono } from "@hono/zod-openapi"
import type { AppVariables } from "@/common/jwt"
import {
	cleanupEmails,
	createUniqueEmail,
	registerClient,
} from "@/common/test-utils"

const mockSend = mock(async () => ({ data: { id: "test-id" }, error: null }))

mock.module("resend", () => ({
	Resend: class {
		emails = { send: mockSend }
	},
}))

describe("Client Conversations integration tests", () => {
	let realApp: OpenAPIHono<{ Variables: AppVariables }>
	const createdEmails = new Set<string>()

	beforeAll(async () => {
		process.env.NODE_ENV ??= "test"
		const mod = await import("@/app")
		realApp = mod.default
	})

	afterAll(async () => {
		await cleanupEmails(Array.from(createdEmails))
	})

	async function setupClient(email: string, name: string) {
		const client = await registerClient(realApp, email, name)
		createdEmails.add(email.toLowerCase())
		const loginRes = await realApp.request("/v1/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password: "password123" }),
		})
		const token = ((await loginRes.json()) as { token: string }).token
		return { client, token }
	}

	async function createConversation(widgetToken: string) {
		const sessionRes = await realApp.request("/v1/widget/sessions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Widget-Token": widgetToken,
			},
			body: JSON.stringify({ browserSessionId: crypto.randomUUID() }),
		})
		const session = (await sessionRes.json()) as { id: string }

		const convRes = await realApp.request(
			`/v1/widget/sessions/${session.id}/conversations`,
			{
				method: "POST",
				headers: { "X-Widget-Token": widgetToken },
			},
		)
		const conversation = (await convRes.json()) as { id: string }
		return { sessionId: session.id, conversationId: conversation.id }
	}

	it("GET /client/me/conversations returns empty list for new client", async () => {
		const email = createUniqueEmail("conv-test")
		const { token } = await setupClient(
			email,
			`Conv Test ${crypto.randomUUID()}`,
		)

		const res = await realApp.request(
			"/v1/client/me/conversations?limit=20&offset=0",
			{ headers: { Authorization: `Bearer ${token}` } },
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as unknown[]
		expect(Array.isArray(body)).toBe(true)
		expect(body.length).toBe(0)
	})

	it("GET /client/me/conversations returns conversations after widget activity", async () => {
		const email = createUniqueEmail("conv-test")
		const { client, token } = await setupClient(
			email,
			`Conv Test ${crypto.randomUUID()}`,
		)

		await createConversation(client.widget_token)

		const res = await realApp.request(
			"/v1/client/me/conversations?limit=20&offset=0",
			{ headers: { Authorization: `Bearer ${token}` } },
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as Array<{ id: string }>
		expect(body.length).toBeGreaterThan(0)
	})

	it("GET /client/me/conversations/:id returns conversation with messages", async () => {
		const email = createUniqueEmail("conv-test")
		const { client, token } = await setupClient(
			email,
			`Conv Test ${crypto.randomUUID()}`,
		)

		const { conversationId } = await createConversation(client.widget_token)

		const res = await realApp.request(
			`/v1/client/me/conversations/${conversationId}`,
			{ headers: { Authorization: `Bearer ${token}` } },
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { id: string; messages: unknown[] }
		expect(body.id).toBe(conversationId)
		expect(Array.isArray(body.messages)).toBe(true)
	})

	it("GET /client/me/conversations/:id with unknown id returns 404", async () => {
		const email = createUniqueEmail("conv-test")
		const { token } = await setupClient(
			email,
			`Conv Test ${crypto.randomUUID()}`,
		)

		const res = await realApp.request(
			`/v1/client/me/conversations/${crypto.randomUUID()}`,
			{ headers: { Authorization: `Bearer ${token}` } },
		)
		expect(res.status).toBe(404)
	})

	it("GET /client/me/conversations without token returns 401", async () => {
		const res = await realApp.request(
			"/v1/client/me/conversations?limit=20&offset=0",
		)
		expect(res.status).toBe(401)
	})
})
