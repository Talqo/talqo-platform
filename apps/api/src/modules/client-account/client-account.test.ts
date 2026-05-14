import { beforeEach, describe, expect, it, mock } from "bun:test"
import { OpenAPIHono } from "@hono/zod-openapi"
import type { AppVariables } from "@/common/jwt"
import { logger } from "@/common/logger"

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockService = {
	deleteAccount: mock(async (_clientId: string, _password: string) => {}),
}

mock.module("./index", () => ({ clientAccountService: mockService }))

// Dynamic imports after mock registration
const { default: clientAccountRoutes } = await import("./client-account.routes")
const { ClientAccountService } = await import("./client-account.service")
const { InMemoryClientAccountRepository } = await import(
	"./client-account.repository"
)
const { errorHandler } = await import("@/common/middleware/error-handler")

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CLIENT_ID = crypto.randomUUID()

function buildApp() {
	const app = new OpenAPIHono<{ Variables: AppVariables }>()
	app.onError(errorHandler)
	app.use("/*", async (c, next) => {
		c.set("clientId", CLIENT_ID)
		c.set("logger", logger.withContext({ requestId: crypto.randomUUID() }))
		await next()
	})
	return app.route("/client", clientAccountRoutes)
}

// ─── Route tests ──────────────────────────────────────────────────────────────

describe("DELETE /client/me", () => {
	let app: ReturnType<typeof buildApp>

	beforeEach(() => {
		app = buildApp()
		mockService.deleteAccount.mockClear()
	})

	it("returns 200 and calls deleteAccount on success", async () => {
		mockService.deleteAccount.mockResolvedValueOnce(undefined)

		const res = await app.fetch(
			new Request("http://localhost/client/me", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ password: "correct-password" }),
			}),
		)

		expect(res.status).toBe(200)
		const body = (await res.json()) as { message: string }
		expect(body.message).toBe("Account deleted")
		expect(mockService.deleteAccount).toHaveBeenCalledTimes(1)
		expect(
			(
				mockService.deleteAccount.mock.calls[0] as unknown as [string, string]
			)[0],
		).toBe(CLIENT_ID)
		expect(
			(
				mockService.deleteAccount.mock.calls[0] as unknown as [string, string]
			)[1],
		).toBe("correct-password")
	})

	it("returns 401 when service throws UnauthorizedError", async () => {
		const { UnauthorizedError } = await import("@/common/errors")
		mockService.deleteAccount.mockRejectedValueOnce(
			new UnauthorizedError("Password is incorrect"),
		)

		const res = await app.fetch(
			new Request("http://localhost/client/me", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ password: "wrong-password" }),
			}),
		)

		expect(res.status).toBe(401)
	})

	it("returns 404 when service throws NotFoundError", async () => {
		const { NotFoundError } = await import("@/common/errors")
		mockService.deleteAccount.mockRejectedValueOnce(
			new NotFoundError("Client not found"),
		)

		const res = await app.fetch(
			new Request("http://localhost/client/me", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ password: "any-password" }),
			}),
		)

		expect(res.status).toBe(404)
	})

	it("returns 422 when password is missing from body", async () => {
		const res = await app.fetch(
			new Request("http://localhost/client/me", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			}),
		)

		expect(res.status).toBe(400)
		expect(mockService.deleteAccount).not.toHaveBeenCalled()
	})
})

// ─── Service tests ────────────────────────────────────────────────────────────

describe("ClientAccountService.deleteAccount", () => {
	let repo: InstanceType<typeof InMemoryClientAccountRepository>
	let service: InstanceType<typeof ClientAccountService>

	const clientId = crypto.randomUUID()
	const plainPassword = "supersecret123"

	beforeEach(async () => {
		repo = new InMemoryClientAccountRepository()
		service = new ClientAccountService(repo)

		const hash = await Bun.password.hash(plainPassword, {
			algorithm: "argon2id",
		})
		repo.seed({
			id: clientId,
			name: "Test User",
			email: "test@example.com",
			passwordHash: hash,
			balanceUsd: "0.0000",
			widgetToken: crypto.randomUUID(),
		})
	})

	it("deletes the account when password is correct", async () => {
		await service.deleteAccount(clientId, plainPassword)
		expect(repo.deletedIds).toContain(clientId)
	})

	it("throws UnauthorizedError when password is wrong", async () => {
		await expect(
			service.deleteAccount(clientId, "wrong-password"),
		).rejects.toMatchObject({ statusCode: 401 })
	})

	it("throws NotFoundError when client does not exist", async () => {
		await expect(
			service.deleteAccount(crypto.randomUUID(), plainPassword),
		).rejects.toMatchObject({ statusCode: 404 })
	})
})
