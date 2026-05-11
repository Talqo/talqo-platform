import { beforeEach, describe, expect, it, mock } from "bun:test"
import { OpenAPIHono } from "@hono/zod-openapi"
import type { adminUsers, clients, conversations, messages } from "db/schema"
import type { AdminRepository } from "./admin.repository"

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock jwt so tests don't require config / env vars
mock.module("@/common/jwt", () => ({
	signToken: async (payload: Record<string, unknown>, _expiresIn?: string) =>
		`mock-token.${JSON.stringify(payload)}`,
	verifyToken: async () => ({ sub: "test", role: "admin" }),
}))

// Dynamic imports after mocks are registered
const { AdminService } = await import("./admin.service")
const {
	createAdminAuthRouter,
	createAdminClientRouter,
	createAdminConversationRouter,
} = await import("./admin.routes")
const { errorHandler } = await import("@/common/middleware/error-handler")

// ─── In-memory repository ─────────────────────────────────────────────────────

type AdminUser = typeof adminUsers.$inferSelect
type ClientRecord = typeof clients.$inferSelect
type ConversationRecord = typeof conversations.$inferSelect
type MessageRecord = typeof messages.$inferSelect

class InMemoryAdminRepository
	implements
		Pick<
			AdminRepository,
			| "findAdminByEmail"
			| "findAdminById"
			| "listClients"
			| "getClientDetail"
			| "updateClientStatus"
			| "listConversations"
			| "getConversationWithMessages"
		>
{
	private admins = new Map<string, AdminUser>()
	private clientsMap = new Map<string, ClientRecord>()
	private conversationsMap = new Map<string, ConversationRecord>()
	private messagesMap = new Map<string, MessageRecord>()

	async findAdminByEmail(email: string) {
		for (const admin of this.admins.values()) {
			if (admin.email === email) return admin
		}
		return null
	}

	async findAdminById(id: string) {
		return this.admins.get(id) ?? null
	}

	async listClients(limit: number, offset: number) {
		return [...this.clientsMap.values()].slice(offset, offset + limit)
	}

	async getClientDetail(clientId: string) {
		const client = this.clientsMap.get(clientId)
		if (!client) return null
		return {
			...client,
			totalTokens: 0,
			totalCostUsd: "0",
			totalConversations: 0,
		}
	}

	async updateClientStatus(clientId: string, status: string) {
		const client = this.clientsMap.get(clientId)
		if (!client) return null
		const updated = { ...client, status }
		this.clientsMap.set(clientId, updated)
		return { id: clientId, status }
	}

	// Test helpers
	addAdmin(email: string, passwordHash: string): AdminUser {
		const admin: AdminUser = {
			id: crypto.randomUUID(),
			email,
			passwordHash,
			createdAt: new Date(),
			isDeleted: false,
			deletedAt: null,
		}
		this.admins.set(admin.id, admin)
		return admin
	}

	addClient(overrides: Partial<ClientRecord> = {}): ClientRecord {
		const client: ClientRecord = {
			id: crypto.randomUUID(),
			name: "Test Client",
			email: "client@example.com",
			passwordHash: "hashed",
			balanceUsd: "100.00",
			monthlyUsageLimit: null,
			usageAlertThresholdUsd: null,
			widgetToken: crypto.randomUUID(),
			status: "active",
			lastActive: null,
			createdAt: new Date(),
			widgetSetupDismissed: false,
			...overrides,
		}
		this.clientsMap.set(client.id, client)
		return client
	}

	addConversation(
		clientId: string,
		overrides: Partial<ConversationRecord> = {},
	): ConversationRecord {
		const conv: ConversationRecord = {
			id: crypto.randomUUID(),
			sessionId: crypto.randomUUID(),
			clientId,
			startedAt: new Date(),
			satisfactionRating: null,
			...overrides,
		}
		this.conversationsMap.set(conv.id, conv)
		return conv
	}

	addMessage(
		conversationId: string,
		overrides: Partial<MessageRecord> = {},
	): MessageRecord {
		const msg: MessageRecord = {
			id: crypto.randomUUID(),
			conversationId,
			role: "user",
			content: "Hello",
			tokenCount: 5,
			createdAt: new Date(),
			...overrides,
		}
		this.messagesMap.set(msg.id, msg)
		return msg
	}

	async listConversations({
		clientId,
		limit,
		offset,
	}: {
		clientId?: string
		limit: number
		offset: number
	}) {
		const convs = [...this.conversationsMap.values()]
			.filter((c) => (clientId ? c.clientId === clientId : true))
			.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
			.slice(offset, offset + limit)

		return convs.map((conv) => {
			const client = this.clientsMap.get(conv.clientId)
			if (!client) throw new Error(`Client ${conv.clientId} not found`)
			const messageCount = [...this.messagesMap.values()].filter(
				(m) => m.conversationId === conv.id,
			).length
			return {
				id: conv.id,
				clientId: conv.clientId,
				clientName: client.name,
				clientEmail: client.email,
				startedAt: conv.startedAt,
				satisfactionRating: conv.satisfactionRating,
				messageCount,
			}
		})
	}

	async getConversationWithMessages(conversationId: string) {
		const conv = this.conversationsMap.get(conversationId)
		if (!conv) return null
		const client = this.clientsMap.get(conv.clientId)
		if (!client) throw new Error(`Client ${conv.clientId} not found`)
		const msgs = [...this.messagesMap.values()]
			.filter((m) => m.conversationId === conversationId)
			.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
		return {
			id: conv.id,
			clientId: conv.clientId,
			clientName: client.name,
			clientEmail: client.email,
			startedAt: conv.startedAt,
			satisfactionRating: conv.satisfactionRating,
			messages: msgs,
		}
	}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = "admin@example.com"
const ADMIN_PASSWORD = "securepassword123"

async function setupRepo() {
	const repo = new InMemoryAdminRepository()
	const passwordHash = await Bun.password.hash(ADMIN_PASSWORD)
	repo.addAdmin(ADMIN_EMAIL, passwordHash)
	return repo
}

function buildApp(repo: InMemoryAdminRepository) {
	const service = new AdminService(repo as unknown as AdminRepository)
	const app = new OpenAPIHono()
	app.onError(errorHandler)
	app.route("/admin/auth", createAdminAuthRouter(service))
	app.route("/admin/clients", createAdminClientRouter(service))
	app.route("/admin/conversations", createAdminConversationRouter(service))
	return { app, service }
}

// ─── AdminService unit tests ──────────────────────────────────────────────────

describe("AdminService.login()", () => {
	let repo: InMemoryAdminRepository

	beforeEach(async () => {
		repo = await setupRepo()
	})

	it("returns token and admin info on valid credentials", async () => {
		const service = new AdminService(repo as unknown as AdminRepository)
		const result = await service.login({
			email: ADMIN_EMAIL,
			password: ADMIN_PASSWORD,
		})
		expect(typeof result.token).toBe("string")
		expect(result.admin.email).toBe(ADMIN_EMAIL)
	})

	it("normalizes email (trim + lowercase)", async () => {
		const service = new AdminService(repo as unknown as AdminRepository)
		const result = await service.login({
			email: "  ADMIN@EXAMPLE.COM  ",
			password: ADMIN_PASSWORD,
		})
		expect(typeof result.token).toBe("string")
	})

	it("throws UnauthorizedError for wrong password", async () => {
		const service = new AdminService(repo as unknown as AdminRepository)
		await expect(
			service.login({ email: ADMIN_EMAIL, password: "wrongpass" }),
		).rejects.toThrow("Invalid email or password")
	})

	it("throws UnauthorizedError for unknown email", async () => {
		const service = new AdminService(repo as unknown as AdminRepository)
		await expect(
			service.login({ email: "nobody@example.com", password: ADMIN_PASSWORD }),
		).rejects.toThrow("Invalid email or password")
	})

	it("returns the same error for wrong password and unknown email (enumeration protection)", async () => {
		const service = new AdminService(repo as unknown as AdminRepository)
		let wrongPassErr: unknown
		let unknownEmailErr: unknown
		try {
			await service.login({ email: ADMIN_EMAIL, password: "wrong" })
		} catch (e) {
			wrongPassErr = e
		}
		try {
			await service.login({
				email: "nobody@example.com",
				password: ADMIN_PASSWORD,
			})
		} catch (e) {
			unknownEmailErr = e
		}
		expect((wrongPassErr as Error).message).toBe(
			(unknownEmailErr as Error).message,
		)
	})
})

describe("AdminService.getClient()", () => {
	let repo: InMemoryAdminRepository

	beforeEach(async () => {
		repo = await setupRepo()
	})

	it("returns client detail when found", async () => {
		const client = repo.addClient()
		const service = new AdminService(repo as unknown as AdminRepository)
		const result = await service.getClient(client.id)
		expect(result.id).toBe(client.id)
		expect(result.totalTokens).toBe(0)
	})

	it("throws NotFoundError when client does not exist", async () => {
		const service = new AdminService(repo as unknown as AdminRepository)
		await expect(service.getClient(crypto.randomUUID())).rejects.toThrow(
			"Client not found",
		)
	})
})

describe("AdminService.updateClientStatus()", () => {
	let repo: InMemoryAdminRepository

	beforeEach(async () => {
		repo = await setupRepo()
	})

	it("updates client status", async () => {
		const client = repo.addClient({ status: "active" })
		const service = new AdminService(repo as unknown as AdminRepository)
		const result = await service.updateClientStatus(client.id, "suspended")
		expect(result.status).toBe("suspended")
	})

	it("throws ValidationError for invalid status", async () => {
		const client = repo.addClient()
		const service = new AdminService(repo as unknown as AdminRepository)
		await expect(
			service.updateClientStatus(client.id, "banned"),
		).rejects.toThrow()
	})

	it("throws NotFoundError when client does not exist", async () => {
		const service = new AdminService(repo as unknown as AdminRepository)
		await expect(
			service.updateClientStatus(crypto.randomUUID(), "suspended"),
		).rejects.toThrow("Client not found")
	})
})

describe("AdminService.impersonate()", () => {
	let repo: InMemoryAdminRepository

	beforeEach(async () => {
		repo = await setupRepo()
	})

	it("returns an impersonation token", async () => {
		const client = repo.addClient()
		const service = new AdminService(repo as unknown as AdminRepository)
		const result = await service.impersonate(client.id)
		expect(typeof result.token).toBe("string")
	})

	it("throws NotFoundError when client does not exist", async () => {
		const service = new AdminService(repo as unknown as AdminRepository)
		await expect(service.impersonate(crypto.randomUUID())).rejects.toThrow(
			"Client not found",
		)
	})
})

// ─── Route integration tests ──────────────────────────────────────────────────

describe("POST /admin/auth/login", () => {
	let app: OpenAPIHono

	beforeEach(async () => {
		const repo = await setupRepo()
		;({ app } = buildApp(repo))
	})

	it("returns 200 with token and admin info on valid credentials", async () => {
		const res = await app.fetch(
			new Request("http://localhost/admin/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
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
			new Request("http://localhost/admin/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: ADMIN_EMAIL, password: "wrongpass" }),
			}),
		)
		expect(res.status).toBe(401)
	})

	it("returns 401 for unknown email", async () => {
		const res = await app.fetch(
			new Request("http://localhost/admin/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "nobody@example.com",
					password: ADMIN_PASSWORD,
				}),
			}),
		)
		expect(res.status).toBe(401)
	})

	it("returns same error for wrong password and unknown email (enumeration protection)", async () => {
		const res1 = await app.fetch(
			new Request("http://localhost/admin/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: ADMIN_EMAIL, password: "wrong" }),
			}),
		)
		const res2 = await app.fetch(
			new Request("http://localhost/admin/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "nobody@example.com",
					password: ADMIN_PASSWORD,
				}),
			}),
		)
		const b1 = (await res1.json()) as { error: { message: string } }
		const b2 = (await res2.json()) as { error: { message: string } }
		expect(b1.error.message).toBe(b2.error.message)
	})

	it("returns 400 for invalid request body", async () => {
		const res = await app.fetch(
			new Request("http://localhost/admin/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: "not-an-email" }),
			}),
		)
		expect(res.status).toBe(400)
	})
})

describe("GET /admin/clients", () => {
	let app: OpenAPIHono
	let repo: InMemoryAdminRepository

	beforeEach(async () => {
		repo = await setupRepo()
		;({ app } = buildApp(repo))
	})

	it("returns 200 with a list of clients", async () => {
		repo.addClient({ name: "Client A" })
		repo.addClient({ name: "Client B", email: "b@example.com" })
		const res = await app.fetch(new Request("http://localhost/admin/clients"))
		expect(res.status).toBe(200)
		const body = (await res.json()) as unknown[]
		expect(Array.isArray(body)).toBe(true)
		expect(body).toHaveLength(2)
	})
})

describe("PATCH /admin/clients/:clientId/status", () => {
	let app: OpenAPIHono
	let repo: InMemoryAdminRepository

	beforeEach(async () => {
		repo = await setupRepo()
		;({ app } = buildApp(repo))
	})

	it("returns 200 and updates the client status", async () => {
		const client = repo.addClient({ status: "active" })
		const res = await app.fetch(
			new Request(`http://localhost/admin/clients/${client.id}/status`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: "suspended" }),
			}),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { status: string }
		expect(body.status).toBe("suspended")
		expect(body).not.toHaveProperty("success")
	})

	it("returns 404 when client does not exist", async () => {
		const res = await app.fetch(
			new Request(
				`http://localhost/admin/clients/${crypto.randomUUID()}/status`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ status: "suspended" }),
				},
			),
		)
		expect(res.status).toBe(404)
	})
})

describe("POST /admin/clients/:clientId/impersonate", () => {
	let app: OpenAPIHono
	let repo: InMemoryAdminRepository

	beforeEach(async () => {
		repo = await setupRepo()
		;({ app } = buildApp(repo))
	})

	it("returns 200 with an impersonation token", async () => {
		const client = repo.addClient()
		const res = await app.fetch(
			new Request(`http://localhost/admin/clients/${client.id}/impersonate`, {
				method: "POST",
			}),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { token: string }
		expect(typeof body.token).toBe("string")
		expect(body).not.toHaveProperty("success")
	})

	it("returns 404 when client does not exist", async () => {
		const res = await app.fetch(
			new Request(
				`http://localhost/admin/clients/${crypto.randomUUID()}/impersonate`,
				{ method: "POST" },
			),
		)
		expect(res.status).toBe(404)
	})
})

// ─── AdminService.listConversations() ─────────────────────────────────────────

describe("AdminService.listConversations()", () => {
	let repo: InMemoryAdminRepository

	beforeEach(async () => {
		repo = await setupRepo()
	})

	it("returns all conversations when no clientId filter is given", async () => {
		const c1 = repo.addClient({ name: "Alice" })
		const c2 = repo.addClient({ name: "Bob", email: "bob@example.com" })
		repo.addConversation(c1.id)
		repo.addConversation(c2.id)
		const service = new AdminService(repo as unknown as AdminRepository)
		const result = await service.listConversations({ limit: 10, offset: 0 })
		expect(result.length).toBe(2)
	})

	it("filters conversations by clientId", async () => {
		const c1 = repo.addClient({ name: "Alice" })
		const c2 = repo.addClient({ name: "Bob", email: "bob@example.com" })
		repo.addConversation(c1.id)
		repo.addConversation(c2.id)
		const service = new AdminService(repo as unknown as AdminRepository)
		const result = await service.listConversations({
			clientId: c1.id,
			limit: 10,
			offset: 0,
		})
		expect(result.length).toBe(1)
		expect(result[0].clientId).toBe(c1.id)
	})

	it("includes clientName, clientEmail, and messageCount", async () => {
		const client = repo.addClient({ name: "Alice", email: "alice@example.com" })
		const conv = repo.addConversation(client.id)
		repo.addMessage(conv.id)
		repo.addMessage(conv.id)
		const service = new AdminService(repo as unknown as AdminRepository)
		const result = await service.listConversations({ limit: 10, offset: 0 })
		expect(result[0].clientName).toBe("Alice")
		expect(result[0].clientEmail).toBe("alice@example.com")
		expect(result[0].messageCount).toBe(2)
	})

	it("respects limit and offset", async () => {
		const client = repo.addClient()
		repo.addConversation(client.id, {
			startedAt: new Date("2024-01-01"),
		})
		repo.addConversation(client.id, {
			startedAt: new Date("2024-01-02"),
		})
		repo.addConversation(client.id, {
			startedAt: new Date("2024-01-03"),
		})
		const service = new AdminService(repo as unknown as AdminRepository)
		const page1 = await service.listConversations({ limit: 2, offset: 0 })
		const page2 = await service.listConversations({ limit: 2, offset: 2 })
		expect(page1.length).toBe(2)
		expect(page2.length).toBe(1)
	})

	it("returns empty array when no conversations exist", async () => {
		const service = new AdminService(repo as unknown as AdminRepository)
		const result = await service.listConversations({ limit: 10, offset: 0 })
		expect(result).toEqual([])
	})
})

// ─── AdminService.getConversation() ───────────────────────────────────────────

describe("AdminService.getConversation()", () => {
	let repo: InMemoryAdminRepository

	beforeEach(async () => {
		repo = await setupRepo()
	})

	it("returns conversation with messages when found", async () => {
		const client = repo.addClient({ name: "Alice" })
		const conv = repo.addConversation(client.id, { satisfactionRating: 4 })
		repo.addMessage(conv.id, { role: "user", content: "Hi" })
		repo.addMessage(conv.id, { role: "assistant", content: "Hello!" })
		const service = new AdminService(repo as unknown as AdminRepository)
		const result = await service.getConversation(conv.id)
		expect(result.id).toBe(conv.id)
		expect(result.clientName).toBe("Alice")
		expect(result.satisfactionRating).toBe(4)
		expect(result.messages.length).toBe(2)
		expect(result.messages[0].content).toBe("Hi")
		expect(result.messages[1].content).toBe("Hello!")
	})

	it("returns empty messages array for a conversation with no messages", async () => {
		const client = repo.addClient()
		const conv = repo.addConversation(client.id)
		const service = new AdminService(repo as unknown as AdminRepository)
		const result = await service.getConversation(conv.id)
		expect(result.messages).toEqual([])
	})

	it("throws NotFoundError when conversation does not exist", async () => {
		const service = new AdminService(repo as unknown as AdminRepository)
		await expect(service.getConversation(crypto.randomUUID())).rejects.toThrow(
			"Conversation not found",
		)
	})
})

// ─── GET /admin/conversations ─────────────────────────────────────────────────

describe("GET /admin/conversations", () => {
	let app: OpenAPIHono
	let repo: InMemoryAdminRepository

	beforeEach(async () => {
		repo = await setupRepo()
		;({ app } = buildApp(repo))
	})

	it("returns 200 with conversation list", async () => {
		const client = repo.addClient()
		repo.addConversation(client.id)
		repo.addConversation(client.id)
		const res = await app.fetch(
			new Request("http://localhost/admin/conversations"),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { id: string }[]
		expect(body.length).toBe(2)
	})

	it("filters by clientId query param", async () => {
		const c1 = repo.addClient()
		const c2 = repo.addClient({ email: "other@example.com" })
		repo.addConversation(c1.id)
		repo.addConversation(c2.id)
		const res = await app.fetch(
			new Request(`http://localhost/admin/conversations?clientId=${c1.id}`),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { clientId: string }[]
		expect(body.length).toBe(1)
		expect(body[0].clientId).toBe(c1.id)
	})

	it("returns 200 with empty array when no conversations exist", async () => {
		const res = await app.fetch(
			new Request("http://localhost/admin/conversations"),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as unknown[]
		expect(body).toEqual([])
	})

	it("returns 400 for invalid clientId (not a UUID)", async () => {
		const res = await app.fetch(
			new Request("http://localhost/admin/conversations?clientId=not-a-uuid"),
		)
		expect(res.status).toBe(400)
	})
})

// ─── GET /admin/conversations/:conversationId ─────────────────────────────────

describe("GET /admin/conversations/:conversationId", () => {
	let app: OpenAPIHono
	let repo: InMemoryAdminRepository

	beforeEach(async () => {
		repo = await setupRepo()
		;({ app } = buildApp(repo))
	})

	it("returns 200 with conversation and messages", async () => {
		const client = repo.addClient({ name: "Alice" })
		const conv = repo.addConversation(client.id, { satisfactionRating: 3 })
		repo.addMessage(conv.id, { role: "user", content: "Hello" })
		const res = await app.fetch(
			new Request(`http://localhost/admin/conversations/${conv.id}`),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			id: string
			clientName: string
			satisfactionRating: number
			messages: { content: string }[]
		}
		expect(body.id).toBe(conv.id)
		expect(body.clientName).toBe("Alice")
		expect(body.satisfactionRating).toBe(3)
		expect(body.messages.length).toBe(1)
		expect(body.messages[0].content).toBe("Hello")
	})

	it("returns 200 with empty messages array when conversation has none", async () => {
		const client = repo.addClient()
		const conv = repo.addConversation(client.id)
		const res = await app.fetch(
			new Request(`http://localhost/admin/conversations/${conv.id}`),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { messages: unknown[] }
		expect(body.messages).toEqual([])
	})

	it("returns 404 when conversation does not exist", async () => {
		const res = await app.fetch(
			new Request(
				`http://localhost/admin/conversations/${crypto.randomUUID()}`,
			),
		)
		expect(res.status).toBe(404)
	})

	it("returns 400 for invalid conversationId (not a UUID)", async () => {
		const res = await app.fetch(
			new Request("http://localhost/admin/conversations/not-a-uuid"),
		)
		expect(res.status).toBe(400)
	})
})
