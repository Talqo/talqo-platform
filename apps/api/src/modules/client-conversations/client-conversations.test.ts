import { beforeEach, describe, expect, it, mock } from "bun:test"
import { OpenAPIHono } from "@hono/zod-openapi"
import type { conversations, messages } from "db/schema"
import type { AppVariables } from "@/common/jwt"
import type { ClientConversationRepository } from "./client-conversations.repository"

// ─── In-memory repository ─────────────────────────────────────────────────────

type ConversationRecord = typeof conversations.$inferSelect
type MessageRecord = typeof messages.$inferSelect

class InMemoryClientConversationRepository
	implements
		Pick<
			ClientConversationRepository,
			"listConversations" | "getConversationWithMessages"
		>
{
	private conversationsMap = new Map<string, ConversationRecord>()
	private messagesMap = new Map<string, MessageRecord>()

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
		clientId: string
		limit: number
		offset: number
	}) {
		return [...this.conversationsMap.values()]
			.filter((c) => c.clientId === clientId)
			.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
			.slice(offset, offset + limit)
			.map((conv) => ({
				id: conv.id,
				startedAt: conv.startedAt,
				satisfactionRating: conv.satisfactionRating,
				messageCount: [...this.messagesMap.values()].filter(
					(m) => m.conversationId === conv.id,
				).length,
			}))
	}

	async getConversationWithMessages(conversationId: string, clientId: string) {
		const conv = this.conversationsMap.get(conversationId)
		if (!conv || conv.clientId !== clientId) return null
		const msgs = [...this.messagesMap.values()]
			.filter((m) => m.conversationId === conversationId)
			.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
		return {
			id: conv.id,
			startedAt: conv.startedAt,
			satisfactionRating: conv.satisfactionRating,
			messages: msgs,
		}
	}
}

// ─── Mock service proxy ───────────────────────────────────────────────────────

const { ClientConversationService } = await import(
	"./client-conversations.service"
)

let activeService: ClientConversationService | null = null

const mockService = {
	listConversations: (clientId: string, limit: number, offset: number) => {
		if (!activeService) throw new Error("activeService not set")
		return activeService.listConversations(clientId, limit, offset)
	},
	getConversation: (conversationId: string, clientId: string) => {
		if (!activeService) throw new Error("activeService not set")
		return activeService.getConversation(conversationId, clientId)
	},
}

mock.module("./index", () => ({
	clientConversationService: mockService,
}))

// Dynamic imports after mock registration
const { clientConversationRoutes } = await import(
	"./client-conversations.routes"
)
const { errorHandler } = await import("@/common/middleware/error-handler")

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CLIENT_A = crypto.randomUUID()
const CLIENT_B = crypto.randomUUID()

function buildApp(clientId: string) {
	const app = new OpenAPIHono<{ Variables: AppVariables }>()
	app.onError(errorHandler)
	// Simulate clientAuth middleware injecting the authenticated client's ID
	app.use("/*", async (c, next) => {
		c.set("clientId", clientId)
		await next()
	})
	app.route("/client/me/conversations", clientConversationRoutes)
	return app
}

// ─── ClientConversationService.listConversations() ───────────────────────────

describe("ClientConversationService.listConversations()", () => {
	let repo: InMemoryClientConversationRepository

	beforeEach(() => {
		repo = new InMemoryClientConversationRepository()
	})

	it("returns only conversations belonging to the requesting client", async () => {
		repo.addConversation(CLIENT_A)
		repo.addConversation(CLIENT_A)
		repo.addConversation(CLIENT_B)
		const service = new ClientConversationService(
			repo as unknown as ClientConversationRepository,
		)
		const result = await service.listConversations(CLIENT_A, 10, 0)
		expect(result.length).toBe(2)
		expect(result.every((c) => c)).toBe(true)
	})

	it("returns empty array when client has no conversations", async () => {
		repo.addConversation(CLIENT_B)
		const service = new ClientConversationService(
			repo as unknown as ClientConversationRepository,
		)
		const result = await service.listConversations(CLIENT_A, 10, 0)
		expect(result).toEqual([])
	})

	it("includes messageCount for each conversation", async () => {
		const conv = repo.addConversation(CLIENT_A)
		repo.addMessage(conv.id, { role: "user" })
		repo.addMessage(conv.id, { role: "assistant" })
		const service = new ClientConversationService(
			repo as unknown as ClientConversationRepository,
		)
		const result = await service.listConversations(CLIENT_A, 10, 0)
		expect(result[0].messageCount).toBe(2)
	})

	it("respects limit and offset", async () => {
		repo.addConversation(CLIENT_A, { startedAt: new Date("2024-01-01") })
		repo.addConversation(CLIENT_A, { startedAt: new Date("2024-01-02") })
		repo.addConversation(CLIENT_A, { startedAt: new Date("2024-01-03") })
		const service = new ClientConversationService(
			repo as unknown as ClientConversationRepository,
		)
		const page1 = await service.listConversations(CLIENT_A, 2, 0)
		const page2 = await service.listConversations(CLIENT_A, 2, 2)
		expect(page1.length).toBe(2)
		expect(page2.length).toBe(1)
	})
})

// ─── ClientConversationService.getConversation() ─────────────────────────────

describe("ClientConversationService.getConversation()", () => {
	let repo: InMemoryClientConversationRepository

	beforeEach(() => {
		repo = new InMemoryClientConversationRepository()
	})

	it("returns conversation with messages when found and owned", async () => {
		const conv = repo.addConversation(CLIENT_A, { satisfactionRating: 4 })
		repo.addMessage(conv.id, { role: "user", content: "Hi" })
		repo.addMessage(conv.id, { role: "assistant", content: "Hello!" })
		const service = new ClientConversationService(
			repo as unknown as ClientConversationRepository,
		)
		const result = await service.getConversation(conv.id, CLIENT_A)
		expect(result.id).toBe(conv.id)
		expect(result.satisfactionRating).toBe(4)
		expect(result.messages.length).toBe(2)
		expect(result.messages[0].content).toBe("Hi")
		expect(result.messages[1].content).toBe("Hello!")
	})

	it("returns empty messages array for a conversation with no messages", async () => {
		const conv = repo.addConversation(CLIENT_A)
		const service = new ClientConversationService(
			repo as unknown as ClientConversationRepository,
		)
		const result = await service.getConversation(conv.id, CLIENT_A)
		expect(result.messages).toEqual([])
	})

	it("throws NotFoundError when conversation does not exist", async () => {
		const service = new ClientConversationService(
			repo as unknown as ClientConversationRepository,
		)
		await expect(
			service.getConversation(crypto.randomUUID(), CLIENT_A),
		).rejects.toThrow("Conversation not found")
	})

	it("throws NotFoundError when conversation belongs to a different client", async () => {
		const conv = repo.addConversation(CLIENT_B)
		const service = new ClientConversationService(
			repo as unknown as ClientConversationRepository,
		)
		// CLIENT_A must not be able to read CLIENT_B's conversation
		await expect(service.getConversation(conv.id, CLIENT_A)).rejects.toThrow(
			"Conversation not found",
		)
	})
})

// ─── GET /client/me/conversations ────────────────────────────────────────────

describe("GET /client/me/conversations", () => {
	let app: OpenAPIHono
	let repo: InMemoryClientConversationRepository

	beforeEach(() => {
		repo = new InMemoryClientConversationRepository()
		activeService = new ClientConversationService(
			repo as unknown as ClientConversationRepository,
		)
		app = buildApp(CLIENT_A)
	})

	it("returns 200 with conversation list", async () => {
		repo.addConversation(CLIENT_A)
		repo.addConversation(CLIENT_A)
		const res = await app.fetch(
			new Request("http://localhost/client/me/conversations"),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { id: string }[]
		expect(Array.isArray(body)).toBe(true)
		expect(body.length).toBe(2)
	})

	it("returns 200 with empty array when no conversations exist", async () => {
		const res = await app.fetch(
			new Request("http://localhost/client/me/conversations"),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as unknown[]
		expect(body).toEqual([])
	})

	it("does not return conversations belonging to other clients", async () => {
		repo.addConversation(CLIENT_B)
		repo.addConversation(CLIENT_A)
		const res = await app.fetch(
			new Request("http://localhost/client/me/conversations"),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { id: string }[]
		expect(body.length).toBe(1)
	})
})

// ─── GET /client/me/conversations/:conversationId ─────────────────────────────

describe("GET /client/me/conversations/:conversationId", () => {
	let app: OpenAPIHono
	let repo: InMemoryClientConversationRepository

	beforeEach(() => {
		repo = new InMemoryClientConversationRepository()
		activeService = new ClientConversationService(
			repo as unknown as ClientConversationRepository,
		)
		app = buildApp(CLIENT_A)
	})

	it("returns 200 with conversation and messages", async () => {
		const conv = repo.addConversation(CLIENT_A, { satisfactionRating: 3 })
		repo.addMessage(conv.id, { role: "user", content: "Hello" })
		const res = await app.fetch(
			new Request(`http://localhost/client/me/conversations/${conv.id}`),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			id: string
			satisfactionRating: number
			messages: { content: string }[]
		}
		expect(body.id).toBe(conv.id)
		expect(body.satisfactionRating).toBe(3)
		expect(body.messages.length).toBe(1)
		expect(body.messages[0].content).toBe("Hello")
	})

	it("returns 200 with empty messages array when conversation has none", async () => {
		const conv = repo.addConversation(CLIENT_A)
		const res = await app.fetch(
			new Request(`http://localhost/client/me/conversations/${conv.id}`),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { messages: unknown[] }
		expect(body.messages).toEqual([])
	})

	it("returns 404 when conversation does not exist", async () => {
		const res = await app.fetch(
			new Request(
				`http://localhost/client/me/conversations/${crypto.randomUUID()}`,
			),
		)
		expect(res.status).toBe(404)
	})

	it("returns 404 when conversation belongs to a different client", async () => {
		const conv = repo.addConversation(CLIENT_B)
		const res = await app.fetch(
			new Request(`http://localhost/client/me/conversations/${conv.id}`),
		)
		expect(res.status).toBe(404)
	})

	it("returns 400 for invalid conversationId (not a UUID)", async () => {
		const res = await app.fetch(
			new Request("http://localhost/client/me/conversations/not-a-uuid"),
		)
		expect(res.status).toBe(400)
	})
})
