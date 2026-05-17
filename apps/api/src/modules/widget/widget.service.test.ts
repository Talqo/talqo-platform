import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"

// --- Mock config/crypto ---
mock.module("@/common/config", () => ({
	config: { WIDGET_CONVERSATION_MAX_MESSAGES: 50 },
	getDefaultProviderConfig: mock(() => null),
}))

mock.module("@/common/crypto", () => ({
	decrypt: mock((s: string) => s),
}))

// --- Post-hoc imports ---

import { NotFoundError } from "@/common/errors"
import { PLATFORM_SYSTEM_PROMPT } from "@/modules/agent/agent.platform-prompt"
import { WidgetService } from "./widget.service"

type StreamResponseFn =
	import("./widget.service").WidgetServiceDeps["streamResponse"]

let mockStreamResponse: ReturnType<typeof mock<StreamResponseFn>>

function createMockStreamResponse(chunks: string[]) {
	return mock(async (_input: unknown) => {
		let i = 0
		const stream = new ReadableStream<string>({
			pull(controller) {
				if (i >= chunks.length) {
					controller.close()
					return
				}
				controller.enqueue(chunks[i++])
			},
		})
		return { stream, usage: Promise.resolve({ input: 5, output: 10 }) }
	})
}

function createMockRepo() {
	let msgCounter = 0
	return {
		findOrCreateSession: mock(async () => ({
			session: {
				id: "sess-1",
				clientId: "client-1",
				browserSessionId: "browser-1",
			},
			isNew: false,
		})),
		getSession: mock(async () => ({
			id: "sess-1",
			clientId: "client-1",
			browserSessionId: "browser-1",
		})),
		createConversation: mock(async () => ({
			id: "conv-1",
			sessionId: "sess-1",
			clientId: "client-1",
			startedAt: new Date().toISOString(),
			endedAt: null,
			satisfactionRating: null,
		})),
		getConversation: mock(async (id: string, clientId: string) =>
			id === "conv-1" && clientId === "client-1"
				? {
						id: "conv-1",
						sessionId: "sess-1",
						clientId: "client-1",
						startedAt: new Date().toISOString(),
						endedAt: null,
						satisfactionRating: null,
					}
				: null,
		),
		getMessages: mock(async () => [
			{
				id: "msg-1",
				conversationId: "conv-1",
				role: "user",
				content: "Hi",
				tokenCount: 2,
				createdAt: new Date().toISOString(),
			},
		]),
		getMessageCount: mock(async () => 1),
		createMessage: mock(async (cid: string, role: string, content: string) => {
			msgCounter++
			return {
				id: `msg-${role}-${msgCounter}`,
				conversationId: cid,
				role,
				content,
				tokenCount: content.length,
				createdAt: new Date().toISOString(),
			}
		}),
		recordUsage: mock(async () => {}),
		getMonthlySpend: mock(async () => "0"),
		getClientLimitSettings: mock(async () => null),
	}
}

function createMockBotConfigRepo(
	config: {
		systemPrompt?: string
		toneStyle?: string
	} | null = null,
) {
	return {
		getByClientId: mock(async () => config),
	}
}

function createMockProviderConfigRepo(
	provider: {
		providerType: string
		apiKeyEncrypted: string
		model: string
		baseUrl: string | null
	} | null = null,
) {
	return {
		getByClientId: mock(async () => provider),
	}
}

function createMockMcpRepo() {
	return {
		listCustomServers: mock(async () => []),
		listEnabledPreMade: mock(async () => []),
	}
}

describe("WidgetService", () => {
	let widgetService: WidgetService
	// biome-ignore lint/suspicious/noExplicitAny: in-memory repos inside tests
	let repo: any
	let botConfigRepo: ReturnType<typeof createMockBotConfigRepo>
	let providerConfigRepo: ReturnType<typeof createMockProviderConfigRepo>
	let mcpRepo: ReturnType<typeof createMockMcpRepo>

	beforeEach(() => {
		repo = createMockRepo()
		botConfigRepo = createMockBotConfigRepo({
			systemPrompt: "You are a test bot",
			toneStyle: "friendly",
		})
		providerConfigRepo = createMockProviderConfigRepo({
			providerType: "openai",
			apiKeyEncrypted: "enc-key-123",
			model: "gpt-4o-mini",
			baseUrl: null,
		})
		mcpRepo = createMockMcpRepo()
		mockStreamResponse = createMockStreamResponse(["Hello", " AI"])

		widgetService = new WidgetService({
			widgetRepository: repo,
			botConfigRepository: botConfigRepo,
			providerConfigRepository: providerConfigRepo,
			mcpRepository: mcpRepo,
			streamResponse: mockStreamResponse,
		})
	})

	afterEach(() => {
		repo.findOrCreateSession.mockClear?.()
		repo.getSession.mockClear?.()
		repo.createConversation.mockClear?.()
		repo.getConversation.mockClear?.()
		repo.getMessages.mockClear?.()
		repo.getMessageCount.mockClear?.()
		repo.createMessage.mockClear?.()
		repo.recordUsage.mockClear?.()
		repo.getMonthlySpend.mockClear?.()
		repo.getClientLimitSettings.mockClear?.()
		mockStreamResponse.mockClear()
	})

	describe("createOrResumeSession", () => {
		it("delegates to repo.findOrCreateSession", async () => {
			const result = await widgetService.createOrResumeSession(
				"client-1",
				"browser-1",
			)
			expect(repo.findOrCreateSession).toHaveBeenCalledWith(
				"client-1",
				"browser-1",
			)
			expect(result.session.id).toBe("sess-1")
		})
	})

	describe("startConversation", () => {
		it("creates a conversation when session exists", async () => {
			const result = await widgetService.startConversation("client-1", "sess-1")
			expect(repo.getSession).toHaveBeenCalledWith("sess-1", "client-1")
			expect(repo.createConversation).toHaveBeenCalledWith("sess-1", "client-1")
			expect(result.id).toBe("conv-1")
		})

		it("throws NotFoundError when session does not exist", async () => {
			repo.getSession = mock(async () => null)
			await expect(
				widgetService.startConversation("client-1", "sess-x"),
			).rejects.toThrow(NotFoundError)
		})
	})

	describe("getMessageHistory", () => {
		it("returns messages for existing conversation", async () => {
			const result = await widgetService.getMessageHistory("client-1", "conv-1")
			expect(result).toHaveLength(1)
		})

		it("throws NotFoundError when conversation not found", async () => {
			repo.getMessages = mock(async () => null)
			await expect(
				widgetService.getMessageHistory("client-1", "conv-x"),
			).rejects.toThrow(NotFoundError)
		})
	})

	describe("sendMessage", () => {
		it("saves user message before streaming", async () => {
			const { userMessage } = await widgetService.sendMessage(
				"client-1",
				"conv-1",
				"Hello bot",
			)

			expect(repo.createMessage).toHaveBeenCalledWith(
				"conv-1",
				"user",
				"Hello bot",
			)
			expect(userMessage.role).toBe("user")
			expect(userMessage.content).toBe("Hello bot")
		})

		it("returns a readable stream", async () => {
			const { stream } = await widgetService.sendMessage(
				"client-1",
				"conv-1",
				"Hello bot",
			)

			const reader = stream.getReader()
			const chunks: string[] = []
			while (true) {
				const { done, value } = await reader.read()
				if (done) break
				chunks.push(value)
			}
			expect(chunks).toEqual(["Hello", " AI"])
			expect(mockStreamResponse).toHaveBeenCalled()
		})

		it("passes history to streamResponse", async () => {
			await widgetService.sendMessage("client-1", "conv-1", "Hello bot")

			const inputs = mockStreamResponse.mock.calls[0][0]
			expect(inputs.history).toBeDefined()
			expect(inputs.history).toHaveLength(1)
			expect(inputs.history[0].role).toBe("user")
			expect(inputs.history[0].content).toBe("Hi")
		})

		it("always prepends the platform system prompt before client context", async () => {
			await widgetService.sendMessage("client-1", "conv-1", "Hello bot")

			const inputs = mockStreamResponse.mock.calls[0][0]
			expect(inputs.context.startsWith(PLATFORM_SYSTEM_PROMPT)).toBe(true)
			expect(inputs.context).toContain("You are a test bot")
		})

		it("throws NotFoundError when conversation does not exist", async () => {
			repo.getMessages = mock(async () => null)
			await expect(
				widgetService.sendMessage("client-1", "conv-x", "Hello"),
			).rejects.toThrow(NotFoundError)
		})

		it("throws CONVERSATION_LIMIT_REACHED at max messages", async () => {
			repo.getMessages = mock(async () =>
				Array.from({ length: 50 }, (_, i) => ({
					id: `msg-${i}`,
					conversationId: "conv-1",
					role: "user",
					content: "x",
					tokenCount: 1,
					createdAt: new Date().toISOString(),
				})),
			)
			await expect(
				widgetService.sendMessage("client-1", "conv-1", "Hello"),
			).rejects.toHaveProperty("code", "CONVERSATION_LIMIT_REACHED")
		})

		it("throws MONTHLY_LIMIT_REACHED when monthly spend equals or exceeds limit", async () => {
			repo.getClientLimitSettings = mock(async () => ({
				monthlyUsageLimit: "10.0000",
				usageAlertThresholdUsd: null,
				email: "client@example.com",
			}))
			repo.getMonthlySpend = mock(async () => "10.0000")
			await expect(
				widgetService.sendMessage("client-1", "conv-1", "Hello"),
			).rejects.toHaveProperty("code", "MONTHLY_LIMIT_REACHED")
		})

		it("throws PROVIDER_NOT_CONFIGURED when no provider exists and no default", async () => {
			providerConfigRepo = createMockProviderConfigRepo(null)
			widgetService = new WidgetService({
				widgetRepository: repo,
				botConfigRepository: botConfigRepo,
				providerConfigRepository: providerConfigRepo,
				mcpRepository: mcpRepo,
				streamResponse: mockStreamResponse,
			})
			await expect(
				widgetService.sendMessage("client-1", "conv-1", "Hello"),
			).rejects.toHaveProperty("code", "PROVIDER_NOT_CONFIGURED")
		})

		it("returns isExternalProvider=true when client has own provider config", async () => {
			const { isExternalProvider } = await widgetService.sendMessage(
				"client-1",
				"conv-1",
				"Hello",
			)
			expect(isExternalProvider).toBe(true)
		})

		it("returns isExternalProvider=false when using default provider", async () => {
			const { getDefaultProviderConfig } = await import("@/common/config")
			;(getDefaultProviderConfig as ReturnType<typeof mock>).mockImplementation(
				() => ({
					type: "openai_compatible",
					apiKey: "platform-key",
					model: "gemma4",
					baseURL: "https://api.example.com",
				}),
			)
			providerConfigRepo = createMockProviderConfigRepo(null)
			widgetService = new WidgetService({
				widgetRepository: repo,
				botConfigRepository: botConfigRepo,
				providerConfigRepository: providerConfigRepo,
				mcpRepository: mcpRepo,
				streamResponse: mockStreamResponse,
			})

			const { isExternalProvider } = await widgetService.sendMessage(
				"client-1",
				"conv-1",
				"Hello",
			)
			expect(isExternalProvider).toBe(false)

			;(getDefaultProviderConfig as ReturnType<typeof mock>).mockImplementation(
				() => null,
			)
		})
	})

	describe("saveAssistantMessage", () => {
		it("saves assistant message and records usage with explicit tokens", async () => {
			const result = await widgetService.saveAssistantMessage(
				"client-1",
				"conv-1",
				"Hello there",
				{ input: 10, output: 5 },
			)

			expect(repo.createMessage).toHaveBeenCalledWith(
				"conv-1",
				"assistant",
				"Hello there",
				15,
			)
			expect(repo.recordUsage).toHaveBeenCalled()
			expect(result.role).toBe("assistant")
		})

		it("defaults tokenCount to 0 when tokensUsed is omitted", async () => {
			await widgetService.saveAssistantMessage(
				"client-1",
				"conv-1",
				"Hello there",
			)

			expect(repo.createMessage).toHaveBeenCalledWith(
				"conv-1",
				"assistant",
				"Hello there",
				0,
			)
		})
	})
})

import { InMemoryWidgetRepository } from "./widget.repository"

describe("InMemoryWidgetRepository", () => {
	describe("recordUsage", () => {
		it("records a balance deduction matching the cost", async () => {
			const repo = new InMemoryWidgetRepository()
			await repo.recordUsage("client-1", "msg-1", 15, "0.000003")

			expect(repo.balanceDeductions).toHaveLength(1)
			expect(repo.balanceDeductions[0]?.clientId).toBe("client-1")
			expect(repo.balanceDeductions[0]?.amount).toBe("0.000003")
		})

		it("does not deduct balance when called without a cost", async () => {
			const repo = new InMemoryWidgetRepository()
			await repo.recordUsage("client-1", "msg-1", 0, "0.000000")

			expect(repo.balanceDeductions).toHaveLength(1)
			expect(repo.balanceDeductions[0]?.amount).toBe("0.000000")
		})
	})
})
