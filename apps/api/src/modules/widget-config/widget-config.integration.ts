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

const DEFAULT_COLORS = {
	primary: "#16a34a",
	bgPrimary: "#ffffff",
	bgSecondary: "#f3f4f6",
	textPrimary: "#111827",
	textSecondary: "#6b7280",
	border: "#e5e7eb",
	headerTitleText: "#ffffff",
	userMessageText: "#ffffff",
	sendButtonIcon: "#ffffff",
	footerText: "#ffffff",
}

describe("Widget Config integration tests", () => {
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

	it("GET /client/me/widget-config returns default config for new client", async () => {
		const email = createUniqueEmail("widget-config-test")
		const token = await registerClient(
			email,
			`Widget Config Test ${crypto.randomUUID()}`,
		)

		const res = await realApp.request("/v1/client/me/widget-config", {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as Record<string, unknown>
		expect(body).toHaveProperty("botName")
		expect(body).toHaveProperty("position")
		expect(body).toHaveProperty("lightColors")
		expect(body).toHaveProperty("darkColors")
		expect(body).toHaveProperty("icons")
	})

	it("PUT /client/me/widget-config saves configuration", async () => {
		const email = createUniqueEmail("widget-config-test")
		const token = await registerClient(
			email,
			`Widget Config Test ${crypto.randomUUID()}`,
		)

		const config = {
			botName: "Support Bot",
			position: "left",
			lightColors: DEFAULT_COLORS,
			darkColors: { ...DEFAULT_COLORS, bgPrimary: "#1a1a1a" },
			icons: { botAvatar: "🤖" },
		}

		const res = await realApp.request("/v1/client/me/widget-config", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(config),
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			botName: string
			position: string
		}
		expect(body.botName).toBe("Support Bot")
		expect(body.position).toBe("left")
	})

	it("PUT /client/me/widget-config change is reflected in GET", async () => {
		const email = createUniqueEmail("widget-config-test")
		const token = await registerClient(
			email,
			`Widget Config Test ${crypto.randomUUID()}`,
		)

		const config = {
			botName: "Custom Bot",
			position: "right",
			lightColors: DEFAULT_COLORS,
			darkColors: DEFAULT_COLORS,
			icons: { botAvatar: "🤖" },
		}

		await realApp.request("/v1/client/me/widget-config", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(config),
		})

		const res = await realApp.request("/v1/client/me/widget-config", {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as { botName: string }
		expect(body.botName).toBe("Custom Bot")
	})

	it("GET /client/me/widget-config without token returns 401", async () => {
		const res = await realApp.request("/v1/client/me/widget-config")
		expect(res.status).toBe(401)
	})
})
