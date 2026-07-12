import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test"
import type { OpenAPIHono } from "@hono/zod-openapi"
import type { AppVariables } from "@/common/jwt"
import {
	cleanupEmails,
	createUniqueEmail,
	registerAndVerify,
} from "@/common/test-utils"

const mockSend = mock(async () => ({ data: { id: "test-id" }, error: null }))

mock.module("resend", () => ({
	Resend: class {
		emails = { send: mockSend }
	},
}))

describe("Bot Config integration tests", () => {
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

	async function registerClient(email: string, name: string) {
		const token = await registerAndVerify(realApp, email, name)
		createdEmails.add(email.toLowerCase())
		return token
	}

	it("GET /client/me/bot-config returns config for new client", async () => {
		const email = createUniqueEmail("bot-config-test")
		const token = await registerClient(
			email,
			`Bot Config Test ${crypto.randomUUID()}`,
		)

		const res = await realApp.request("/v1/client/me/bot-config", {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as Record<string, unknown>
		expect(body).toHaveProperty("systemPrompt")
		expect(body).toHaveProperty("defaultRole")
		expect(body).toHaveProperty("toneStyle")
	})

	it("PATCH /client/me/bot-config updates system prompt", async () => {
		const email = createUniqueEmail("bot-config-test")
		const token = await registerClient(
			email,
			`Bot Config Test ${crypto.randomUUID()}`,
		)

		const res = await realApp.request("/v1/client/me/bot-config", {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ systemPrompt: "You are a helpful assistant." }),
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as { systemPrompt: string | null }
		expect(body.systemPrompt).toBe("You are a helpful assistant.")
	})

	it("PATCH /client/me/bot-config update is reflected in GET", async () => {
		const email = createUniqueEmail("bot-config-test")
		const token = await registerClient(
			email,
			`Bot Config Test ${crypto.randomUUID()}`,
		)

		await realApp.request("/v1/client/me/bot-config", {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				defaultRole: "Customer support agent",
				toneStyle: "Friendly and informal",
			}),
		})

		const res = await realApp.request("/v1/client/me/bot-config", {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			defaultRole: string | null
			toneStyle: string | null
		}
		expect(body.defaultRole).toBe("Customer support agent")
		expect(body.toneStyle).toBe("Friendly and informal")
	})

	it("PATCH /client/me/bot-config allows setting fields to null", async () => {
		const email = createUniqueEmail("bot-config-test")
		const token = await registerClient(
			email,
			`Bot Config Test ${crypto.randomUUID()}`,
		)

		await realApp.request("/v1/client/me/bot-config", {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ systemPrompt: "Initial prompt" }),
		})

		const res = await realApp.request("/v1/client/me/bot-config", {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ systemPrompt: null }),
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as { systemPrompt: string | null }
		expect(body.systemPrompt).toBeNull()
	})

	it("GET /client/me/bot-config without token returns 401", async () => {
		const res = await realApp.request("/v1/client/me/bot-config")
		expect(res.status).toBe(401)
	})
})
