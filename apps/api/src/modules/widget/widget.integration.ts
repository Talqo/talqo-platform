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

mock.module("ai", () => ({
	streamText: mock(() => ({
		fullStream: (async function* () {
			yield { type: "text-delta", text: "Hello" }
		})(),
		usage: Promise.resolve({ inputTokens: 1, outputTokens: 2 }),
	})),
	stepCountIs: mock(() => () => false),
	generateText: mock(() =>
		Promise.resolve({ text: "Hello", finishReason: "stop" }),
	),
	embed: mock(() =>
		Promise.resolve({ embedding: [0.1, 0.2, 0.3], usage: { tokens: 1 } }),
	),
	embedMany: mock(() =>
		Promise.resolve({
			embeddings: [[0.1, 0.2, 0.3]],
			usage: { tokens: 1 },
		}),
	),
	tool: mock((config: unknown) => config),
}))

describe("Widget integration tests", () => {
	let realApp: OpenAPIHono<{ Variables: AppVariables }>
	const createdEmails = new Set<string>()

	beforeAll(async () => {
		const mod = await import("@/app")
		realApp = mod.default
	})

	afterAll(async () => {
		await cleanupEmails(Array.from(createdEmails))
	})

	async function registerWidgetClient(email: string, name: string) {
		const client = await registerClient(realApp, email, name)
		createdEmails.add(email.toLowerCase())
		return client
	}

	it("POST /widget/sessions creates a new session", async () => {
		const email = createUniqueEmail("widget-test")
		const client = await registerWidgetClient(
			email,
			`Widget Session Test ${crypto.randomUUID()}`,
		)

		const res = await realApp.request("/v1/widget/sessions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Widget-Token": client.widget_token,
			},
			body: JSON.stringify({ browserSessionId: crypto.randomUUID() }),
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as { id: string }
		expect(body.id).toBeDefined()
	})

	it("POST /widget/sessions/:sessionId/conversations creates a conversation", async () => {
		const email = createUniqueEmail("widget-test")
		const client = await registerWidgetClient(
			email,
			`Widget Conversation Test ${crypto.randomUUID()}`,
		)

		const sessionRes = await realApp.request("/v1/widget/sessions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Widget-Token": client.widget_token,
			},
			body: JSON.stringify({ browserSessionId: crypto.randomUUID() }),
		})
		expect(sessionRes.status).toBe(200)
		const session = (await sessionRes.json()) as { id: string }

		const convRes = await realApp.request(
			`/v1/widget/sessions/${session.id}/conversations`,
			{
				method: "POST",
				headers: { "X-Widget-Token": client.widget_token },
			},
		)
		expect(convRes.status).toBe(201)
		const body = (await convRes.json()) as { id: string }
		expect(body.id).toBeDefined()
	})

	it("GET /widget/config returns widget configuration", async () => {
		const email = createUniqueEmail("widget-test")
		const client = await registerWidgetClient(
			email,
			`Widget Config Test ${crypto.randomUUID()}`,
		)

		const res = await realApp.request("/v1/widget/config", {
			headers: { "X-Widget-Token": client.widget_token },
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as Record<string, unknown>
		expect(body).toHaveProperty("botName")
		expect(body).toHaveProperty("position")
		expect(body).toHaveProperty("lightColors")
		expect(body).toHaveProperty("darkColors")
		expect(body).toHaveProperty("icons")
	})

	it("POST /widget/sessions/:sessionId/conversations/:conversationId/messages sends a message", async () => {
		const email = createUniqueEmail("widget-test")
		const client = await registerWidgetClient(
			email,
			`Widget Message Test ${crypto.randomUUID()}`,
		)

		const sessionRes = await realApp.request("/v1/widget/sessions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Widget-Token": client.widget_token,
			},
			body: JSON.stringify({ browserSessionId: crypto.randomUUID() }),
		})
		expect(sessionRes.status).toBe(200)
		const session = (await sessionRes.json()) as { id: string }

		const convRes = await realApp.request(
			`/v1/widget/sessions/${session.id}/conversations`,
			{
				method: "POST",
				headers: { "X-Widget-Token": client.widget_token },
			},
		)
		expect(convRes.status).toBe(201)
		const conversation = (await convRes.json()) as { id: string }

		const msgRes = await realApp.request(
			`/v1/widget/sessions/${session.id}/conversations/${conversation.id}/messages`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Widget-Token": client.widget_token,
				},
				body: JSON.stringify({ content: "Hello bot" }),
			},
		)
		expect(msgRes.status).toBe(200)
		const contentType = msgRes.headers.get("Content-Type") ?? ""
		expect(contentType).toContain("text/event-stream")

		const reader = msgRes.body?.getReader()
		const decoder = new TextDecoder()
		let sseText = ""
		if (reader) {
			while (true) {
				const { done, value } = await reader.read()
				if (done) break
				sseText += decoder.decode(value, { stream: true })
			}
		}
		expect(sseText).toContain("event: token")
		expect(sseText).toContain("Hello")
	})

	it("GET /widget/sessions/:sessionId/conversations/:conversationId/messages lists messages", async () => {
		const email = createUniqueEmail("widget-test")
		const client = await registerWidgetClient(
			email,
			`Widget List Messages Test ${crypto.randomUUID()}`,
		)

		const sessionRes = await realApp.request("/v1/widget/sessions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Widget-Token": client.widget_token,
			},
			body: JSON.stringify({ browserSessionId: crypto.randomUUID() }),
		})
		expect(sessionRes.status).toBe(200)
		const session = (await sessionRes.json()) as { id: string }

		const convRes = await realApp.request(
			`/v1/widget/sessions/${session.id}/conversations`,
			{
				method: "POST",
				headers: { "X-Widget-Token": client.widget_token },
			},
		)
		expect(convRes.status).toBe(201)
		const conversation = (await convRes.json()) as { id: string }

		const res = await realApp.request(
			`/v1/widget/sessions/${session.id}/conversations/${conversation.id}/messages`,
			{
				headers: { "X-Widget-Token": client.widget_token },
			},
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as unknown[]
		expect(Array.isArray(body)).toBe(true)
		expect(body.length).toBe(0)
	})

	it("POST /widget/sessions without token returns 401", async () => {
		const res = await realApp.request("/v1/widget/sessions", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ browserSessionId: crypto.randomUUID() }),
		})
		expect(res.status).toBe(401)
	})
})
