import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"
import { OpenAPIHono } from "@hono/zod-openapi"
import type { AppVariables } from "../../common/jwt"
import { logger } from "../../common/logger"

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

function buildApp() {
	const repo = new InMemoryAuthRepository()
	const service = new AuthService(repo)
	const app = new OpenAPIHono<{ Variables: AppVariables }>()
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
		const body = (await res.json()) as Record<string, unknown>
		expect(body.success).toBe(true)
		expect(mockSend).toHaveBeenCalledTimes(1)
		expect((mockSend.mock.calls[0] as [{ to: string }])[0].to).toBe(
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
			new Request(`http://localhost/auth/verify-email?token=${pending!.token}`),
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
	let app: ReturnType<typeof buildApp>["app"]
	let repo: InstanceType<typeof InMemoryAuthRepository>

	beforeEach(() => {
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
			new Request(`http://localhost/auth/verify-email?token=${pending!.token}`),
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
			new Request(`http://localhost/auth/verify-email?token=${pending!.token}`),
		)
		expect(firstRes.status).toBe(200)
		const firstBody = (await firstRes.json()) as {
			success: boolean
			data: { token: string }
		}

		// Second verification with same token should also succeed (idempotent)
		const secondRes = await app.fetch(
			new Request(`http://localhost/auth/verify-email?token=${pending!.token}`),
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
	let app: ReturnType<typeof buildApp>["app"]
	let repo: InstanceType<typeof InMemoryAuthRepository>

	beforeEach(async () => {
		const built = buildApp()
		app = built.app
		repo = built.repo
		process.env.JWT_SECRET = "test-secret"

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
			new Request(`http://localhost/auth/verify-email?token=${pending!.token}`),
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
		expect(((await res.json()) as Record<string, unknown>).success).toBe(true)
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
			new Request(`http://localhost/auth/verify-email?token=${pending!.token}`),
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
		expect(((await res.json()) as Record<string, unknown>).success).toBe(true)
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
		expect(((await res.json()) as Record<string, unknown>).success).toBe(true)
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
