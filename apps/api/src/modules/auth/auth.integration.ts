import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test"
import type { OpenAPIHono } from "@hono/zod-openapi"
import type { AppVariables } from "@/common/jwt"
import {
	cleanupEmails,
	createUniqueEmail,
	registerAndVerify,
	registerClient,
} from "@/common/test-utils"

const mockSend = mock(async () => ({ data: { id: "test-id" }, error: null }))

mock.module("resend", () => ({
	Resend: class {
		emails = { send: mockSend }
	},
}))

describe("Auth integration tests with real app", () => {
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

	async function registerVerifyAndLogin(
		email: string,
		name: string,
		password = "password123",
	) {
		const token = await registerAndVerify(realApp, email, name, password)
		createdEmails.add(email.toLowerCase())
		return { email, password, token }
	}

	it("POST /auth/register with unique email", async () => {
		const email = createUniqueEmail("integration-test")
		const name = `Integration Test ${crypto.randomUUID()}`
		const password = "password123"

		const registerRes = await realApp.request("/v1/auth/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, email, password }),
		})
		expect(registerRes.status).toBe(201)
		createdEmails.add(email.toLowerCase())
	})

	it("POST /auth/login with valid credentials returns token", async () => {
		const email = createUniqueEmail("integration-test")
		const name = `Integration Test ${crypto.randomUUID()}`
		const { token } = await registerVerifyAndLogin(email, name)
		expect(token).toBeDefined()
	})

	it("POST /auth/login with invalid credentials returns 401", async () => {
		const loginRes = await realApp.request("/v1/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email: "nonexistent@example.com",
				password: "wrongpassword",
			}),
		})
		expect(loginRes.status).toBe(401)
	})

	it("POST /auth/verify-email without token returns error", async () => {
		const res = await realApp.request("/v1/auth/verify-email", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		})
		expect(res.status).toBe(400)
	})

	it("POST /auth/register with duplicate email returns 409", async () => {
		const email = createUniqueEmail("integration-test")
		const name = `Integration Test ${crypto.randomUUID()}`
		const password = "password123"

		const res1 = await realApp.request("/v1/auth/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, email, password }),
		})
		expect(res1.status).toBe(201)
		createdEmails.add(email.toLowerCase())

		const res2 = await realApp.request("/v1/auth/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Other", email, password }),
		})
		expect(res2.status).toBe(409)
	})

	it("POST /auth/verify-email with invalid token returns 400", async () => {
		const res = await realApp.request("/v1/auth/verify-email", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: "invalid-token" }),
		})
		expect(res.status).toBe(400)
	})

	it("POST /auth/forgot-password sends reset email for existing user", async () => {
		mockSend.mockClear()
		const email = createUniqueEmail("integration-test")
		const name = `Integration Test ${crypto.randomUUID()}`
		await registerClient(realApp, email, name)
		createdEmails.add(email.toLowerCase())
		mockSend.mockClear()

		const forgotRes = await realApp.request("/v1/auth/forgot-password", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email }),
		})
		expect(forgotRes.status).toBe(200)
		expect(mockSend).toHaveBeenCalledTimes(1)
	})

	it("GET /client/me returns profile for authenticated user", async () => {
		const email = createUniqueEmail("integration-test")
		const name = `Integration Test ${crypto.randomUUID()}`
		const { token: jwtToken } = await registerVerifyAndLogin(email, name)

		const meRes = await realApp.request("/v1/client/me", {
			headers: { Authorization: `Bearer ${jwtToken}` },
		})
		expect(meRes.status).toBe(200)
		const body = (await meRes.json()) as { name: string; email: string }
		expect(body.name).toBe(name)
		expect(body.email).toBe(email.toLowerCase())
	})
})
