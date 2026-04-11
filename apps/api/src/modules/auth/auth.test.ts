import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"
import { OpenAPIHono } from "@hono/zod-openapi"
import type { AppVariables } from "../../common/jwt"
import { logger } from "../../common/logger"

const mockSendVerificationEmail = mock(
	async (_to: string, _token: string) => {},
)

const mockSendPasswordResetEmail = mock(
	async (_to: string, _token: string) => {},
)

mock.module("../../common/email/email.service", () => ({
	sendVerificationEmail: mockSendVerificationEmail,
	sendPasswordResetEmail: mockSendPasswordResetEmail,
}))

const { createAuthRouter } = await import("./auth.routes")
const { InMemoryAuthRepository } = await import("./auth.repository")
const { AuthService } = await import("./auth.service")

function buildApp() {
	const repo = new InMemoryAuthRepository()
	const service = new AuthService(repo)
	const app = new OpenAPIHono<{ Variables: AppVariables }>()
	app.use("/*", async (c, next) => {
		c.set("logger", logger.withContext({ requestId: crypto.randomUUID() }))
		await next()
	})
	return app.route("/auth", createAuthRouter(service))
}

const validRegistration = {
	name: "Alice",
	email: "alice@example.com",
	password: "password123",
}

describe("POST /auth/register", () => {
	let app: ReturnType<typeof buildApp>

	beforeEach(() => {
		app = buildApp()
		mockSendVerificationEmail.mockClear()
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
		const body = (await res.json()) as Record<string, unknown>
		expect(body.success).toBe(true)
		expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1)
		expect(
			(mockSendVerificationEmail.mock.calls[0] as [string, string])[0],
		).toBe(validRegistration.email)
	})

	it("returns 409 when a verified account already exists for the email", async () => {
		// Complete the full flow to create a CLIENT record
		let capturedToken = ""
		mockSendVerificationEmail.mockImplementationOnce(async (_to, token) => {
			capturedToken = token
		})
		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		)
		await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${capturedToken}`),
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
		expect(body.success).toBe(false)
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
	let app: ReturnType<typeof buildApp>

	beforeEach(() => {
		app = buildApp()
		mockSendVerificationEmail.mockClear()
	})

	it("returns 200 and creates the CLIENT account", async () => {
		let capturedToken = ""
		mockSendVerificationEmail.mockImplementationOnce(async (_to, token) => {
			capturedToken = token
		})

		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		)

		const res = await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${capturedToken}`),
		)
		expect(res.status).toBe(200)
		expect(((await res.json()) as Record<string, unknown>).success).toBe(true)
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
		let capturedToken = ""
		mockSendVerificationEmail.mockImplementationOnce(async (_to, token) => {
			capturedToken = token
		})

		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		)

		const firstRes = await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${capturedToken}`),
		)
		expect(firstRes.status).toBe(200)
		const firstBody = (await firstRes.json()) as {
			success: boolean
			data: { token: string }
		}

		// Second verification with same token should also succeed (idempotent)
		const secondRes = await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${capturedToken}`),
		)
		expect(secondRes.status).toBe(200)
		const secondBody = (await secondRes.json()) as {
			success: boolean
			data: { token: string }
		}

		// Both should return valid JWT tokens
		expect(firstBody.success).toBe(true)
		expect(secondBody.success).toBe(true)
		expect(typeof firstBody.data.token).toBe("string")
		expect(typeof secondBody.data.token).toBe("string")
	})
})

describe("POST /auth/login", () => {
	let app: ReturnType<typeof buildApp>

	beforeEach(async () => {
		app = buildApp()
		process.env.JWT_SECRET = "test-secret"

		// Register and verify a client
		let capturedToken = ""
		mockSendVerificationEmail.mockImplementationOnce(async (_to, token) => {
			capturedToken = token
		})

		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		)
		await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${capturedToken}`),
		)
		mockSendVerificationEmail.mockClear()
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
		const body = (await res.json()) as {
			success: boolean
			data: { token: string }
		}
		expect(body.success).toBe(true)
		expect(typeof body.data.token).toBe("string")
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
		mockSendVerificationEmail.mockImplementationOnce(async () => {})
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
	let app: ReturnType<typeof buildApp>

	beforeEach(() => {
		app = buildApp()
		mockSendVerificationEmail.mockClear()
	})

	it("returns 200 and resends verification email for pending registration", async () => {
		// Register but don't verify
		mockSendVerificationEmail.mockImplementationOnce(async () => {})
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
		expect(((await res.json()) as Record<string, unknown>).success).toBe(true)
		expect(mockSendVerificationEmail).toHaveBeenCalledTimes(2) // Once for register, once for resend
	})

	it("returns 200 even if email is already verified (prevents enumeration)", async () => {
		// Register and verify first
		let capturedToken = ""
		mockSendVerificationEmail.mockImplementationOnce(async (_to, token) => {
			capturedToken = token
		})
		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		)
		await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${capturedToken}`),
		)
		mockSendVerificationEmail.mockClear()

		// Try to resend
		const res = await app.fetch(
			new Request("http://localhost/auth/resend-verification", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: validRegistration.email }),
			}),
		)

		expect(res.status).toBe(200)
		expect(((await res.json()) as Record<string, unknown>).success).toBe(true)
		expect(mockSendVerificationEmail).not.toHaveBeenCalled() // No email sent for verified accounts
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
		expect(((await res.json()) as Record<string, unknown>).success).toBe(true)
		expect(mockSendVerificationEmail).not.toHaveBeenCalled()
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
	let app: ReturnType<typeof buildApp>

	beforeEach(async () => {
		app = buildApp()
		mockSendPasswordResetEmail.mockClear()
		process.env.JWT_SECRET = "test-secret"

		// Register and verify a client for testing
		let capturedToken = ""
		mockSendVerificationEmail.mockImplementationOnce(async (_to, token) => {
			capturedToken = token
		})

		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		)
		await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${capturedToken}`),
		)
		mockSendVerificationEmail.mockClear()
	})

	it("returns success for non-existent email (no enumeration)", async () => {
		const res = await app.fetch(
			new Request("http://localhost/auth/forgot-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "nonexistent@example.com" }),
			}),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as Record<string, unknown>
		expect(body.success).toBe(true)
		expect(mockSendPasswordResetEmail).not.toHaveBeenCalled()
	})

	it("returns success for existing client and sends email", async () => {
		let resetToken = ""
		mockSendPasswordResetEmail.mockImplementationOnce(async (_to, token) => {
			resetToken = token
		})

		const res = await app.fetch(
			new Request("http://localhost/auth/forgot-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: validRegistration.email }),
			}),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as Record<string, unknown>
		expect(body.success).toBe(true)
		expect(mockSendPasswordResetEmail).toHaveBeenCalled()
		expect(resetToken).not.toBe("")
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
	let app: ReturnType<typeof buildApp>
	let resetToken: string

	beforeEach(async () => {
		app = buildApp()
		mockSendPasswordResetEmail.mockClear()
		process.env.JWT_SECRET = "test-secret"

		// Register and verify a client
		let capturedToken = ""
		mockSendVerificationEmail.mockImplementationOnce(async (_to, token) => {
			capturedToken = token
		})

		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		)
		await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${capturedToken}`),
		)
		mockSendVerificationEmail.mockClear()

		// Request password reset
		resetToken = ""
		mockSendPasswordResetEmail.mockImplementationOnce(async (_to, token) => {
			resetToken = token
		})

		await app.fetch(
			new Request("http://localhost/auth/forgot-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: validRegistration.email }),
			}),
		)
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
		const body = (await res.json()) as Record<string, unknown>
		expect(body.success).toBe(true)

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
		const loginBody = (await loginRes.json()) as { success: boolean }
		expect(loginBody.success).toBe(true)
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
	let app: ReturnType<typeof buildApp>
	let resetToken: string

	beforeEach(async () => {
		app = buildApp()
		mockSendPasswordResetEmail.mockClear()
		process.env.JWT_SECRET = "test-secret"

		// Register and verify a client
		let capturedToken = ""
		mockSendVerificationEmail.mockImplementationOnce(async (_to, token) => {
			capturedToken = token
		})

		await app.fetch(
			new Request("http://localhost/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validRegistration),
			}),
		)
		await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${capturedToken}`),
		)
		mockSendVerificationEmail.mockClear()

		// Request password reset
		resetToken = ""
		mockSendPasswordResetEmail.mockImplementationOnce(async (_to, token) => {
			resetToken = token
		})

		await app.fetch(
			new Request("http://localhost/auth/forgot-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: validRegistration.email }),
			}),
		)
	})

	it("returns 200 for valid token", async () => {
		const res = await app.fetch(
			new Request(
				`http://localhost/auth/verify-reset-token?token=${resetToken}`,
			),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			success: boolean
			data: { valid: boolean }
		}
		expect(body.success).toBe(true)
		expect(body.data.valid).toBe(true)
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
