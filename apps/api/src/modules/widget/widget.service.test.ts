import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test"

// --- Mock config ---
mock.module("@/common/config", () => ({
	config: { WIDGET_CONVERSATION_MAX_MESSAGES: 50 },
}))

// --- Post-hoc imports ---

import { BadRequestError, NotFoundError } from "@/common/errors"
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
			startedAt: new Date(),
			satisfactionRating: null,
		})),
		getConversation: mock(async (id: string, clientId: string) =>
			id === "conv-1" && clientId === "client-1"
				? {
						id: "conv-1",
						sessionId: "sess-1",
						clientId: "client-1",
						startedAt: new Date(),
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
				createdAt: new Date(),
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
				createdAt: new Date(),
			}
		}),
		recordUsage: mock(async () => {}),
		getMonthlySpend: mock(async () => 0),
		getClientLimitSettings: mock(async () => null),
	}
}

function createMockBotConfigService(overrides?: {
	systemPrompt?: string | null
	toneStyle?: string | null
}) {
	return {
		getConfig: mock(async (_clientId: string) => ({
			id: "bot-1",
			clientId: "client-1",
			systemPrompt: overrides?.systemPrompt ?? null,
			defaultRole: null,
			toneStyle: overrides?.toneStyle ?? null,
			createdAt: new Date(),
			updatedAt: new Date(),
		})),
	}
}

function createMockProviderConfigService(
	overrides?: {
		providerType?: string
		apiKey?: string
		model?: string
	} | null,
) {
	if (overrides === null) {
		return {
			resolveForAi: mock(async () => {
				throw new BadRequestError(
					"PROVIDER_NOT_CONFIGURED",
					"No AI provider configured",
				)
			}),
		}
	}
	return {
		resolveForAi: mock(async () => ({
			config: {
				providerType: overrides?.providerType ?? "openai",
				apiKey: overrides?.apiKey ?? "test-key",
				model: overrides?.model ?? "gpt-4o-mini",
			},
			isExternal: true,
		})),
	}
}

function createMockMcpService() {
	return {
		listCustomServers: mock(async () => []),
		listEnabledPreMade: mock(async () => []),
	}
}

function createMockBlacklistRepo(words: string[] = []) {
	return {
		listByClientId: mock(async (_clientId: string) =>
			words.map((word, i) => ({
				id: `bl-${i}`,
				clientId: "client-1",
				word,
				createdAt: new Date(),
			})),
		),
	}
}

describe("WidgetService", () => {
	let widgetService: WidgetService
	// biome-ignore lint/suspicious/noExplicitAny: in-memory repos inside tests
	let repo: any
	let botConfigService: ReturnType<typeof createMockBotConfigService>
	let providerConfigService: ReturnType<typeof createMockProviderConfigService>
	let mcpService: ReturnType<typeof createMockMcpService>
	let blacklistRepo: ReturnType<typeof createMockBlacklistRepo>

	beforeEach(() => {
		repo = createMockRepo()
		botConfigService = createMockBotConfigService({
			systemPrompt: "You are a test bot",
			toneStyle: "friendly",
		})
		providerConfigService = createMockProviderConfigService({
			providerType: "openai",
			apiKey: "test-key",
			model: "gpt-4o-mini",
		})
		mcpService = createMockMcpService()
		blacklistRepo = createMockBlacklistRepo(["badword", "spam"])
		mockStreamResponse = createMockStreamResponse(["Hello", " AI"])

		widgetService = new WidgetService({
			widgetRepository: repo,
			botConfigService,
			providerConfigService,
			mcpService,
			blacklistRepository: blacklistRepo,
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
		botConfigService.getConfig.mockClear?.()
		providerConfigService.resolveForAi.mockClear?.()
		mcpService.listCustomServers.mockClear?.()
		mcpService.listEnabledPreMade.mockClear?.()
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

		it("passes client blacklist words to streamResponse", async () => {
			const result = await widgetService.sendMessage(
				"client-1",
				"conv-1",
				"hello",
			)
			await result.stream.getReader().read()
			const inputs = mockStreamResponse.mock.calls[0]?.[0] as {
				wordBlacklist: string[]
			}
			expect(inputs.wordBlacklist).toEqual(["badword", "spam"])
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
					createdAt: new Date(),
				})),
			)
			await expect(
				widgetService.sendMessage("client-1", "conv-1", "Hello"),
			).rejects.toHaveProperty("code", "CONVERSATION_LIMIT_REACHED")
		})

		it("throws MONTHLY_LIMIT_REACHED when monthly spend equals or exceeds limit", async () => {
			repo.getClientLimitSettings = mock(async () => ({
				monthlyUsageLimit: 10,
				usageAlertThresholdUsd: null,
				email: "client@example.com",
			}))
			repo.getMonthlySpend = mock(async () => 10)
			await expect(
				widgetService.sendMessage("client-1", "conv-1", "Hello"),
			).rejects.toHaveProperty("code", "MONTHLY_LIMIT_REACHED")
		})

		it("throws PROVIDER_NOT_CONFIGURED when no provider exists and no default", async () => {
			providerConfigService = createMockProviderConfigService(null)
			widgetService = new WidgetService({
				widgetRepository: repo,
				botConfigService,
				providerConfigService,
				mcpService,
				blacklistRepository: blacklistRepo,
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
			providerConfigService = createMockProviderConfigService({
				providerType: "openai_compatible",
				apiKey: "platform-key",
				model: "gemma4",
			})
			providerConfigService.resolveForAi = mock(async () => ({
				config: {
					providerType: "openai_compatible",
					apiKey: "platform-key",
					model: "gemma4",
					baseUrl: "https://api.example.com",
				},
				isExternal: false,
			}))
			widgetService = new WidgetService({
				widgetRepository: repo,
				botConfigService,
				providerConfigService,
				mcpService,
				blacklistRepository: blacklistRepo,
				streamResponse: mockStreamResponse,
			})

			const { isExternalProvider } = await widgetService.sendMessage(
				"client-1",
				"conv-1",
				"Hello",
			)
			expect(isExternalProvider).toBe(false)
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
			const repoAny = repo as unknown as {
				clients: Map<string, { balanceUsd: number }>
			}
			repoAny.clients.set("client-1", { balanceUsd: 1 })
			await repo.recordUsage("client-1", "msg-1", 15, 0.000003)

			expect(repo.balanceDeductions).toHaveLength(1)
			expect(repo.balanceDeductions[0]?.clientId).toBe("client-1")
			expect(repo.balanceDeductions[0]?.amount).toBe(0.000003)
		})

		it("does not deduct balance when called without a cost", async () => {
			const repo = new InMemoryWidgetRepository()
			const repoAny = repo as unknown as {
				clients: Map<string, { balanceUsd: number }>
			}
			repoAny.clients.set("client-1", { balanceUsd: 1 })
			await repo.recordUsage("client-1", "msg-1", 0, 0)

			expect(repo.balanceDeductions).toHaveLength(1)
			expect(repo.balanceDeductions[0]?.amount).toBe(0)
		})

		it("throws CLIENT_NOT_FOUND when the client has not been seeded", async () => {
			const repo = new InMemoryWidgetRepository()
			await expect(
				repo.recordUsage("missing-client", "msg-x", 10, 0.001),
			).rejects.toMatchObject({ code: "CLIENT_NOT_FOUND" })
		})

		it("throws when balance is insufficient to cover cost", async () => {
			const repo = new InMemoryWidgetRepository()
			const repoAny = repo as unknown as {
				clients: Map<string, { balanceUsd: number }>
			}
			repoAny.clients.set("client-1", { balanceUsd: 0.005 })
			await expect(
				repo.recordUsage("client-1", "msg-1", 50, 0.01),
			).rejects.toThrow()
		})

		it("does not record usage when balance is insufficient (atomic rollback)", async () => {
			const repo = new InMemoryWidgetRepository()
			const repoAny = repo as unknown as {
				clients: Map<string, { balanceUsd: number }>
				usages: { clientId: string; tokensUsed: number }[]
			}
			repoAny.clients.set("client-1", { balanceUsd: 0.005 })
			await expect(
				repo.recordUsage("client-1", "msg-1", 50, 0.01),
			).rejects.toThrow()
			expect(repoAny.usages).toHaveLength(0)
			expect(repoAny.clients.get("client-1")?.balanceUsd).toBe(0.005)
		})
	})

	describe("getMonthlySpend", () => {
		it("returns 0 for a month that has no usage records", async () => {
			const repo = new InMemoryWidgetRepository()
			const repoAny = repo as unknown as {
				clients: Map<string, { balanceUsd: number }>
			}
			repoAny.clients.set("client-1", { balanceUsd: 1 })
			await repo.recordUsage("client-1", "msg-1", 100, 0.001)

			// Request spend for year 2000, month 1 — no usage was recorded in that period
			const spend = await repo.getMonthlySpend("client-1", 2000, 1)
			expect(spend).toBe(0)
		})

		it("returns only the spend recorded in the requested month", async () => {
			const repo = new InMemoryWidgetRepository()
			// Simulate usage from a different month by directly injecting with a past date
			const repoAny = repo as unknown as {
				usages: {
					clientId: string
					messageId: string
					tokensUsed: number
					costUsd: number
					recordedAt: Date
				}[]
			}
			const pastDate = new Date(2023, 0, 15) // January 2023
			repoAny.usages.push({
				clientId: "client-1",
				messageId: "msg-old",
				tokensUsed: 50,
				costUsd: 0.005,
				recordedAt: pastDate,
			})

			// Current usage (February 2023)
			const currentDate = new Date(2023, 1, 10)
			repoAny.usages.push({
				clientId: "client-1",
				messageId: "msg-new",
				tokensUsed: 100,
				costUsd: 0.01,
				recordedAt: currentDate,
			})

			// Only February spend should be returned
			const spend = await repo.getMonthlySpend("client-1", 2023, 2)
			expect(spend).toBe(0.01)
		})
	})
})
