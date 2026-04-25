import type { ModelMessage } from "ai"
import type { AiProviderConfig, McpServerConfig } from "shared"
import { z } from "zod"
import { config, getDefaultProviderConfig } from "../../common/config"
import { decrypt } from "../../common/crypto"
import {
	BadRequestError,
	NotFoundError,
	ValidationError,
} from "../../common/errors"
import { PLATFORM_SYSTEM_PROMPT } from "../agent/agent.platform-prompt"
import type { AgentPort } from "../agent/agent.port"
import { defaultAgentPort } from "../agent/agent.port"
import type { BotConfigRepository } from "../bot-config/bot-config.repository"
import type { McpRepository } from "../mcp/mcp.repository"
import type { ProviderConfigRepository } from "../provider-config/provider-config.repository"
import type { WidgetRepository } from "./widget.repository"

const PLATFORM_MODEL_INPUT_RATE = 0.1 / 1_000_000
const PLATFORM_MODEL_OUTPUT_RATE = 0.2 / 1_000_000

function computeCostUsd(tokensUsed: { input: number; output: number }): string {
	const cost =
		tokensUsed.input * PLATFORM_MODEL_INPUT_RATE +
		tokensUsed.output * PLATFORM_MODEL_OUTPUT_RATE
	return cost.toFixed(6)
}

const providerConfigSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("openai"),
		apiKey: z.string().min(1),
		model: z.string().min(1),
		baseURL: z.string().optional(),
	}),
	z.object({
		type: z.literal("openai_compatible"),
		apiKey: z.string().min(1),
		model: z.string().min(1),
		baseURL: z.string().min(1),
	}),
	z.object({
		type: z.literal("google"),
		apiKey: z.string().min(1),
		model: z.string().min(1),
		baseURL: z.string().optional(),
	}),
	z.object({
		type: z.literal("anthropic"),
		apiKey: z.string().min(1),
		model: z.string().min(1),
		baseURL: z.string().optional(),
	}),
])

type WidgetServiceDeps = {
	widgetRepository: WidgetRepository
	botConfigRepository: BotConfigRepository
	providerConfigRepository: ProviderConfigRepository
	mcpRepository: McpRepository
	agentPort?: AgentPort
}

export class WidgetService {
	private readonly repo: WidgetRepository
	private readonly botConfigRepo: BotConfigRepository
	private readonly providerConfigRepo: ProviderConfigRepository
	private readonly mcpRepo: McpRepository
	private readonly agent: AgentPort

	constructor(deps: WidgetServiceDeps) {
		this.repo = deps.widgetRepository
		this.botConfigRepo = deps.botConfigRepository
		this.providerConfigRepo = deps.providerConfigRepository
		this.mcpRepo = deps.mcpRepository
		this.agent = deps.agentPort ?? defaultAgentPort
	}

	async createOrResumeSession(clientId: string, browserSessionId: string) {
		return this.repo.findOrCreateSession(clientId, browserSessionId)
	}

	async startConversation(clientId: string, sessionId: string) {
		const session = await this.repo.getSession(sessionId, clientId)
		if (!session) throw new NotFoundError("Session not found")
		return this.repo.createConversation(sessionId, clientId)
	}

	async getMessageHistory(clientId: string, conversationId: string) {
		const msgs = await this.repo.getMessages(conversationId, clientId)
		if (msgs === null) throw new NotFoundError("Conversation not found")
		return msgs
	}

	async sendMessage(
		clientId: string,
		conversationId: string,
		content: string,
	): Promise<{
		stream: ReadableStream<string>
		userMessage: Awaited<ReturnType<WidgetRepository["createMessage"]>>
		usage: Promise<{ input: number; output: number }>
		isExternalProvider: boolean
	}> {
		const dbMessages = await this.repo.getMessages(conversationId, clientId)
		if (!dbMessages) throw new NotFoundError("Conversation not found")
		if (dbMessages.length >= config.WIDGET_CONVERSATION_MAX_MESSAGES) {
			throw new BadRequestError(
				"CONVERSATION_LIMIT_REACHED",
				"Conversation limit reached — please start a new conversation",
			)
		}

		const { config: provider, isExternal } =
			await this.resolveProvider(clientId)

		const botConfig = await this.botConfigRepo.getByClientId(clientId)
		const contextParts: string[] = [PLATFORM_SYSTEM_PROMPT]
		if (botConfig?.systemPrompt) contextParts.push(botConfig.systemPrompt)
		if (botConfig?.toneStyle) contextParts.push(`Tone: ${botConfig.toneStyle}`)
		const context = contextParts.join("\n")

		const mcpServers = await this.resolveMcpServers(clientId)

		const history = this.buildHistory(dbMessages)

		const userMessage = await this.repo.createMessage(
			conversationId,
			"user",
			content,
		)

		const { stream, usage } = await this.agent.streamResponse({
			userMessage: content,
			history,
			context,
			wordBlacklist: [],
			mcpServers,
			contextDirectory: "",
			provider,
			maxSteps: 10,
		})

		return { stream, userMessage, usage, isExternalProvider: isExternal }
	}

	async saveAssistantMessage(
		clientId: string,
		conversationId: string,
		content: string,
		tokensUsed?: { input: number; output: number },
	) {
		const tokenCount =
			tokensUsed !== undefined ? tokensUsed.input + tokensUsed.output : 0
		const assistantMessage = await this.repo.createMessage(
			conversationId,
			"assistant",
			content,
			tokenCount,
		)

		if (tokensUsed !== undefined) {
			const costUsd = computeCostUsd(tokensUsed)
			await this.repo.recordUsage(
				clientId,
				assistantMessage.id,
				tokenCount,
				costUsd,
			)
		}

		return assistantMessage
	}

	async resetConversation(clientId: string, sessionId: string) {
		const session = await this.repo.getSession(sessionId, clientId)
		if (!session) throw new NotFoundError("Session not found")
		return this.repo.createConversation(sessionId, clientId)
	}

	async rateConversation(
		clientId: string,
		conversationId: string,
		rating: number,
	) {
		if (rating < 1 || rating > 5) {
			throw new ValidationError("Rating must be between 1 and 5")
		}
		const updated = await this.repo.rateConversation(
			conversationId,
			clientId,
			rating,
		)
		if (!updated) throw new NotFoundError("Conversation not found")
		return updated
	}

	private async resolveProvider(
		clientId: string,
	): Promise<{ config: AiProviderConfig; isExternal: boolean }> {
		const providerConfig = await this.providerConfigRepo.getByClientId(clientId)
		if (providerConfig) {
			const parsed = providerConfigSchema.safeParse({
				type: providerConfig.providerType,
				apiKey: await decrypt(providerConfig.apiKeyEncrypted),
				model: providerConfig.model,
				baseURL: providerConfig.baseUrl ?? undefined,
			})
			if (!parsed.success) {
				throw new BadRequestError(
					"PROVIDER_CONFIG_INVALID",
					`Invalid provider config: ${parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
				)
			}
			return { config: parsed.data, isExternal: true }
		}
		const defaultConfig = getDefaultProviderConfig()
		if (!defaultConfig) {
			throw new BadRequestError(
				"PROVIDER_NOT_CONFIGURED",
				"No AI provider configured",
			)
		}
		return { config: defaultConfig, isExternal: false }
	}

	private async resolveMcpServers(
		clientId: string,
	): Promise<McpServerConfig[]> {
		const custom = await this.mcpRepo.listCustomServers(clientId)
		const preMade = await this.mcpRepo.listEnabledPreMade(clientId)
		return [
			...custom.map((s) => s.mcpConfig as unknown as McpServerConfig),
			...preMade.map((s) => s.mcpConfig as unknown as McpServerConfig),
		]
	}

	private buildHistory(
		dbMessages: Awaited<ReturnType<WidgetRepository["getMessages"]>>,
	): ModelMessage[] {
		if (!dbMessages) return []
		return dbMessages
			.filter((m) => m.role === "user" || m.role === "assistant")
			.map((m) => ({
				role: m.role,
				content: m.content,
			}))
	}
}
