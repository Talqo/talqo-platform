import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"
import { OpenAPIHono } from "@hono/zod-openapi"
import type { AppVariables } from "@/common/jwt"
import { logger } from "@/common/logger"

// Track email sends for assertions - mock at the resend level to avoid module caching issues
// with email.service.test.ts which also mocks resend
const mockSend = mock(async () => ({ data: { id: "test-id" }, error: null }))

mock.module("resend", () => ({
	Resend: class {
		emails = { send: mockSend }
	},
}))

const { createAuthRouter } = await import("./auth.routes")
const { InMemoryAuthRepository } = await import("./auth.repository")
const { AuthService } = await import("./auth.service")
const { errorHandler } = await import("@/common/middleware/error-handler")

function buildApp() {
	const repo = new InMemoryAuthRepository()
	const service = new AuthService(repo)
	const app = new OpenAPIHono<{ Variables: AppVariables }>()
	app.onError(errorHandler)
	app.use("/*", async (c, next) => {
		c.set("logger", logger.withContext({ requestId: crypto.randomUUID() }))
		await next()
	})
	return { app: app.route("/auth", createAuthRouter(service)), repo }
}

const validRegistration = {
	name: "Alice",
	email: "alice@example.com",
	password: "password123",
}

describe("POST /auth/register", () => {
	let app: ReturnType<typeof buildApp>["app"]
	let repo: InstanceType<typeof InMemoryAuthRepository>

	beforeEach(() => {
		process.env.APP_URL ??= "http://localhost:5173"
		process.env.RESEND_API_KEY ??= "test-api-key"
		const built = buildApp()
		app = built.app
		repo = built.repo
		mockSend.mockClear()
	})

	it("returns 201 and sends verification email on success", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		)
		expect(res.status).toBe(201)
		const body = (await res.json()) as { message: string }
		expect(body.message).toBe("Verification email sent")
		expect(body).not.toHaveProperty("success")
		expect(mockSend).toHaveBeenCalledTimes(1)
		expect((mockSend.mock.calls[0] as unknown as [{ to: string }])[0].to).toBe(
			validRegistration.email,
		)
	})

	it("returns 409 when a verified account already exists for the email", async () => {
		// Complete the full flow to create a CLIENT record
		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		)

		// Get token from repository to verify email
		const pending = await repo.findPendingByEmail(validRegistration.email)
		await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${pending?.token}`),
		)

		// Second registration with same email
		const res = await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		)
		expect(res.status).toBe(409)
		const body = (await res.json()) as Record<string, unknown>
		expect(body.error).toBeDefined()
		expect((body.error as { code: string }).code).toBe("EMAIL_TAKEN")
	})

	it("returns 400 for invalid email", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Alice",
					email: "not-an-email",
					password: "password123",
				}),
			}),
		)
		expect(res.status).toBe(400)
	})

	it("returns 400 when password is too short", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Alice",
					email: "alice@example.com",
					password: "short",
				}),
			}),
		)
		expect(res.status).toBe(400)
	})

	it("returns 400 when name is missing", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "alice@example.com",
					password: "password123",
				}),
			}),
		)
		expect(res.status).toBe(400)
	})
})

describe("GET /auth/verify-email", () => {
	let app: ReturnType<typeof buildApp>["app"]
	let repo: InstanceType<typeof InMemoryAuthRepository>

	beforeEach(() => {
		process.env.APP_URL ??= "http://localhost:5173"
		process.env.RESEND_API_KEY ??= "test-api-key"
		const built = buildApp()
		app = built.app
		repo = built.repo
		mockSend.mockClear()
	})

	it("returns 200 and creates the CLIENT account", async () => {
		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		)

		// Get token from repository
		const pending = await repo.findPendingByEmail(validRegistration.email)

		const res = await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${pending?.token}`),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { token: string; message: string }
		expect(body.token).toBeDefined()
		expect(body.message).toBe("Email verified successfully")
		expect(body).not.toHaveProperty("success")
	})

	it("returns 400 for an unknown token", async () => {
		const res = await app.fetch(
			new Request(
				`http://localhost/auth/verify-email?token=${crypto.randomUUID()}`,
			),
		)
		expect(res.status).toBe(400)
	})

	it("returns 400 when token is not a valid UUID", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/verify-email?token=not-a-uuid"),
		)
		expect(res.status).toBe(400)
	})

	it("returns 200 when the same token is used twice (idempotent)", async () => {
		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		)

		// Get token from repository
		const pending = await repo.findPendingByEmail(validRegistration.email)

		const firstRes = await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${pending?.token}`),
		)
		expect(firstRes.status).toBe(200)
		const firstBody = (await firstRes.json()) as { token: string }

		// Second verification with same token should also succeed (idempotent)
		const secondRes = await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${pending?.token}`),
		)
		expect(secondRes.status).toBe(200)
		const secondBody = (await secondRes.json()) as { token: string }

		// Both should return valid JWT tokens
		expect(firstBody.token).toBeDefined()
		expect(secondBody.token).toBeDefined()
		expect(typeof firstBody.token).toBe("string")
		expect(typeof secondBody.token).toBe("string")
	})
})

describe("POST /auth/login", () => {
	let app: ReturnType<typeof buildApp>["app"]
	let repo: InstanceType<typeof InMemoryAuthRepository>

	beforeEach(async () => {
		process.env.APP_URL ??= "http://localhost:5173"
		process.env.RESEND_API_KEY ??= "test-api-key"
		process.env.JWT_SECRET ??= "test-secret"
		const built = buildApp()
		app = built.app
		repo = built.repo

		// Register and verify a client
		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		)

		// Get token from repository and verify
		const pending = await repo.findPendingByEmail(validRegistration.email)
		await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${pending?.token}`),
		)
		mockSend.mockClear()
	})

	afterEach(() => {
		delete process.env.JWT_SECRET
	})

	it("returns 200 with a JWT token on valid credentials", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: validRegistration.email,
					password: validRegistration.password,
				}),
			}),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { token: string }
		expect(body.token).toBeDefined()
		expect(typeof body.token).toBe("string")
		expect(body).not.toHaveProperty("success")
	})

	it("returns 401 for wrong password", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: validRegistration.email,
					password: "wrongpassword",
				}),
			}),
		)
		expect(res.status).toBe(401)
	})

	it("returns 401 for unknown email", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "nobody@example.com",
					password: "password123",
				}),
			}),
		)
		expect(res.status).toBe(401)
	})

	it("returns 401 when email is registered but not yet verified", async () => {
		// Register but do NOT verify
		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Bob",
					email: "bob@example.com",
					password: "password123",
				}),
			}),
		)

		// No CLIENT record exists yet — login should return 401 (invalid credentials)
		const res = await app.fetch(
			new Request("http://localhost/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "bob@example.com",
					password: "password123",
				}),
			}),
		)
		expect(res.status).toBe(401)
	})

	it("returns 400 for invalid request body", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "not-an-email" }),
			}),
		)
		expect(res.status).toBe(400)
	})
})

describe("POST /auth/resend-verification", () => {
	let app: ReturnType<typeof buildApp>["app"]
	let repo: InstanceType<typeof InMemoryAuthRepository>

	beforeEach(() => {
		process.env.APP_URL ??= "http://localhost:5173"
		process.env.RESEND_API_KEY ??= "test-api-key"
		const built = buildApp()
		app = built.app
		repo = built.repo
		mockSend.mockClear()
	})

	it("returns 200 and resends verification email for pending registration", async () => {
		// Register but don't verify
		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		)

		// Request resend
		const res = await app.fetch(
			new Request("http://localhost/auth/resend-verification", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: validRegistration.email }),
			}),
		)

		expect(res.status).toBe(200)
		const body1 = (await res.json()) as { message: string }
		expect(body1.message).toBeDefined()
		expect(body1).not.toHaveProperty("success")
		expect(mockSend).toHaveBeenCalledTimes(2) // Once for register, once for resend
	})

	it("returns 200 even if email is already verified (prevents enumeration)", async () => {
		// Register and verify first
		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		)

		const pending = await repo.findPendingByEmail(validRegistration.email)
		await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${pending?.token}`),
		)
		mockSend.mockClear()

		// Try to resend
		const res = await app.fetch(
			new Request("http://localhost/auth/resend-verification", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: validRegistration.email }),
			}),
		)

		expect(res.status).toBe(200)
		const body2 = (await res.json()) as { message: string }
		expect(body2.message).toBeDefined()
		expect(body2).not.toHaveProperty("success")
		expect(mockSend).not.toHaveBeenCalled() // No email sent for verified accounts
	})

	it("returns 200 even if email has no pending registration (prevents enumeration)", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/resend-verification", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "nonexistent@example.com" }),
			}),
		)

		expect(res.status).toBe(200)
		const body3 = (await res.json()) as { message: string }
		expect(body3.message).toBeDefined()
		expect(body3).not.toHaveProperty("success")
		expect(mockSend).not.toHaveBeenCalled()
	})

	it("returns 400 for invalid email format", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/resend-verification", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "not-an-email" }),
			}),
		)

		expect(res.status).toBe(400)
	})
})

describe("POST /auth/forgot-password", () => {
	let app: ReturnType<typeof buildApp>["app"]
	let repo: InstanceType<typeof InMemoryAuthRepository>

	beforeEach(async () => {
		process.env.JWT_SECRET = "test-secret"
		process.env.APP_URL ??= "http://localhost:5173"
		process.env.RESEND_API_KEY ??= "test-api-key"
		const built = buildApp()
		app = built.app
		repo = built.repo
		mockSend.mockClear()

		// Register and verify a client for testing
		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		)
		const pending = await repo.findPendingByEmail(validRegistration.email)
		await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${pending?.token}`),
		)
		mockSend.mockClear()
	})

	it("returns success for non-existent email (no enumeration)", async () => {
		const sendCountBefore = mockSend.mock.calls.length
		const res = await app.fetch(
			new Request("http://localhost/auth/forgot-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "nonexistent@example.com" }),
			}),
		)
		expect(res.status).toBe(200)
		const body4 = (await res.json()) as { message: string }
		expect(body4.message).toBeDefined()
		expect(body4).not.toHaveProperty("success")
		// No additional email should be sent for non-existent email
		expect(mockSend.mock.calls.length).toBe(sendCountBefore)
	})

	it("returns success for existing client and sends email", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/forgot-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: validRegistration.email }),
			}),
		)
		expect(res.status).toBe(200)
		const body5 = (await res.json()) as { message: string }
		expect(body5.message).toBeDefined()
		expect(body5).not.toHaveProperty("success")
		expect(mockSend).toHaveBeenCalledTimes(1)
	})

	it("returns 400 for invalid email", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/forgot-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "not-an-email" }),
			}),
		)
		expect(res.status).toBe(400)
	})
})

describe("POST /auth/reset-password", () => {
	let app: ReturnType<typeof buildApp>["app"]
	let repo: InstanceType<typeof InMemoryAuthRepository>
	let resetToken: string

	beforeEach(async () => {
		process.env.JWT_SECRET = "test-secret"
		process.env.APP_URL ??= "http://localhost:5173"
		process.env.RESEND_API_KEY ??= "test-api-key"
		const built = buildApp()
		app = built.app
		repo = built.repo
		mockSend.mockClear()

		// Register and verify a client
		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		)
		const pending = await repo.findPendingByEmail(validRegistration.email)
		await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${pending?.token}`),
		)
		mockSend.mockClear()

		// Request password reset and capture the token from the sent email
		await app.fetch(
			new Request("http://localhost/auth/forgot-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: validRegistration.email }),
			}),
		)
		const resetCall = mockSend.mock.calls[0] as unknown as [{ html: string }]
		const match = resetCall[0].html.match(/token=([a-f0-9-]{36})/)
		resetToken = match ? match[1] : ""
		mockSend.mockClear()
	})

	it("returns 400 for invalid token", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					token: "00000000-0000-0000-0000-000000000000",
					password: "newpassword123",
				}),
			}),
		)
		expect(res.status).toBe(400)
		const body = (await res.json()) as Record<string, unknown>
		expect(body).toHaveProperty("error")
	})

	it("returns 400 for short password", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					token: resetToken,
					password: "short",
				}),
			}),
		)
		expect(res.status).toBe(400)
	})

	it("resets password and allows login with new password", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					token: resetToken,
					password: "newpassword123",
				}),
			}),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { message: string }
		expect(body.message).toBe("Password reset successful")
		expect(body).not.toHaveProperty("success")

		// Login with new password should work
		const loginRes = await app.fetch(
			new Request("http://localhost/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: validRegistration.email,
					password: "newpassword123",
				}),
			}),
		)
		expect(loginRes.status).toBe(200)
		const loginBody = (await loginRes.json()) as { token: string }
		expect(loginBody.token).toBeDefined()
		expect(loginBody).not.toHaveProperty("success")
	})

	it("returns 400 when token is reused", async () => {
		// First reset
		const firstRes = await app.fetch(
			new Request("http://localhost/auth/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					token: resetToken,
					password: "newpassword123",
				}),
			}),
		)
		expect(firstRes.status).toBe(200)

		// Second reset with same token should fail
		const res = await app.fetch(
			new Request("http://localhost/auth/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					token: resetToken,
					password: "anotherpassword123",
				}),
			}),
		)
		expect(res.status).toBe(400)
	})
})

describe("GET /auth/verify-reset-token", () => {
	let app: ReturnType<typeof buildApp>["app"]
	let repo: InstanceType<typeof InMemoryAuthRepository>
	let resetToken: string

	beforeEach(async () => {
		process.env.JWT_SECRET = "test-secret"
		process.env.APP_URL ??= "http://localhost:5173"
		process.env.RESEND_API_KEY ??= "test-api-key"
		const built = buildApp()
		app = built.app
		repo = built.repo
		mockSend.mockClear()

		// Register and verify a client
		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		)
		const pending = await repo.findPendingByEmail(validRegistration.email)
		await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${pending?.token}`),
		)
		mockSend.mockClear()

		// Request password reset and capture the token from the sent email
		await app.fetch(
			new Request("http://localhost/auth/forgot-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: validRegistration.email }),
			}),
		)
		const resetCall = mockSend.mock.calls[0] as unknown as [{ html: string }]
		const match = resetCall[0].html.match(/token=([a-f0-9-]{36})/)
		resetToken = match ? match[1] : ""
		mockSend.mockClear()
	})

	it("returns 200 for valid token", async () => {
		const res = await app.fetch(
			new Request(
				`http://localhost/auth/verify-reset-token?token=${resetToken}`,
			),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { valid: boolean }
		expect(body.valid).toBe(true)
		expect(body).not.toHaveProperty("success")
	})

	it("returns 400 for invalid token", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/verify-reset-token?token=invalid"),
		)
		expect(res.status).toBe(400)
	})

	it("returns 400 for non-existent token", async () => {
		const res = await app.fetch(
			new Request(
				"http://localhost/auth/verify-reset-token?token=00000000-0000-0000-0000-000000000000",
			),
		)
		expect(res.status).toBe(400)
	})
})
