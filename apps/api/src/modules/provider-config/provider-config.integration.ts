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

// Prevent the async re-index side effect from hitting real S3/AI
mock.module("@/modules/rag/index", () => ({
	ragService: {
		indexFile: mock(async () => {}),
		removeAllFiles: mock(async () => {}),
		removeFile: mock(async () => {}),
		renameFile: mock(async () => {}),
	},
}))

mock.module("@/modules/files/index", () => ({
	filesService: {
		list: mock(async () => ({ files: [], directories: [] })),
	},
}))

describe("Provider Config integration tests", () => {
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

	it("GET /client/me/provider-config returns null for new client", async () => {
		const email = createUniqueEmail("provider-config-test")
		const token = await registerClient(
			email,
			`Provider Config Test ${crypto.randomUUID()}`,
		)

		const res = await realApp.request("/v1/client/me/provider-config", {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(body).toBeNull()
	})

	it("PUT /client/me/provider-config creates configuration", async () => {
		const email = createUniqueEmail("provider-config-test")
		const token = await registerClient(
			email,
			`Provider Config Test ${crypto.randomUUID()}`,
		)

		const res = await realApp.request("/v1/client/me/provider-config", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				providerType: "openai",
				apiKey: "sk-test-key",
				model: "gpt-4o",
			}),
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			providerType: string
			model: string
		}
		expect(body.providerType).toBe("openai")
		expect(body.model).toBe("gpt-4o")
	})

	it("PUT /client/me/provider-config masks the API key in response", async () => {
		const email = createUniqueEmail("provider-config-test")
		const token = await registerClient(
			email,
			`Provider Config Test ${crypto.randomUUID()}`,
		)

		const res = await realApp.request("/v1/client/me/provider-config", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				providerType: "openai",
				apiKey: "sk-super-secret-key",
				model: "gpt-4o",
			}),
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as Record<string, unknown>
		expect(body.apiKeyMasked).not.toBe("sk-super-secret-key")
		expect(body.apiKeyMasked).toMatch(/^\*+[^*]{4}$/)
	})

	it("GET /client/me/provider-config returns saved config after PUT", async () => {
		const email = createUniqueEmail("provider-config-test")
		const token = await registerClient(
			email,
			`Provider Config Test ${crypto.randomUUID()}`,
		)

		await realApp.request("/v1/client/me/provider-config", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				providerType: "anthropic",
				apiKey: "sk-ant-test",
				model: "claude-3-5-sonnet",
			}),
		})

		const res = await realApp.request("/v1/client/me/provider-config", {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as { providerType: string; model: string }
		expect(body.providerType).toBe("anthropic")
		expect(body.model).toBe("claude-3-5-sonnet")
	})

	it("DELETE /client/me/provider-config removes configuration", async () => {
		const email = createUniqueEmail("provider-config-test")
		const token = await registerClient(
			email,
			`Provider Config Test ${crypto.randomUUID()}`,
		)

		await realApp.request("/v1/client/me/provider-config", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				providerType: "openai",
				apiKey: "sk-test",
				model: "gpt-4o-mini",
			}),
		})

		const deleteRes = await realApp.request("/v1/client/me/provider-config", {
			method: "DELETE",
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(deleteRes.status).toBe(200)

		const getRes = await realApp.request("/v1/client/me/provider-config", {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(getRes.status).toBe(200)
		const body = await getRes.json()
		expect(body).toBeNull()
	})

	it("DELETE /client/me/provider-config when none exists returns 404", async () => {
		const email = createUniqueEmail("provider-config-test")
		const token = await registerClient(
			email,
			`Provider Config Test ${crypto.randomUUID()}`,
		)

		const res = await realApp.request("/v1/client/me/provider-config", {
			method: "DELETE",
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(res.status).toBe(404)
	})

	it("GET /client/me/provider-config without token returns 401", async () => {
		const res = await realApp.request("/v1/client/me/provider-config")
		expect(res.status).toBe(401)
	})
})
