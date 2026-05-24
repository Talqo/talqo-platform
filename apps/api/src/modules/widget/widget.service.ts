import type { ModelMessage } from "ai"
import { type McpServerConfig, mcpServerConfigSchema } from "shared"
import { config } from "@/common/config"
import { sendQuotaAlertEmail as defaultSendQuotaAlertEmail } from "@/common/email/email.service"
import {
	BadRequestError,
	NotFoundError,
	ValidationError,
} from "@/common/errors"
import { logger } from "@/common/logger"
import { PLATFORM_SYSTEM_PROMPT } from "@/modules/agent/agent.platform-prompt"
import { streamResponse } from "@/modules/agent/agent.service"
import type { BlacklistRepository } from "@/modules/blacklist/blacklist.repository"
import type { BotConfigService } from "@/modules/bot-config/bot-config.service"
import type { McpService } from "@/modules/mcp/mcp.service"
import type { ProviderConfigService } from "@/modules/provider-config/provider-config.service"
import type { RagService } from "@/modules/rag/rag.service"
import type { WidgetRepository } from "./widget.repository"

const PLATFORM_MODEL_INPUT_RATE = 0.1 / 1_000_000
const PLATFORM_MODEL_OUTPUT_RATE = 0.2 / 1_000_000

function computeCostUsd(tokensUsed: { input: number; output: number }): string {
	const cost =
		tokensUsed.input * PLATFORM_MODEL_INPUT_RATE +
		tokensUsed.output * PLATFORM_MODEL_OUTPUT_RATE
	return cost.toFixed(6)
}

type StreamResponse = typeof streamResponse
type SendQuotaAlertEmail = (to: string, usagePercent: number) => Promise<void>

type WidgetServiceDeps = {
	widgetRepository: WidgetRepository
	botConfigService: BotConfigService
	providerConfigService: ProviderConfigService
	mcpService: McpService
	blacklistRepository: BlacklistRepository
	ragService?: Pick<RagService, "retrieve">
	streamResponse?: StreamResponse
	sendQuotaAlertEmail?: SendQuotaAlertEmail
}

export class WidgetService {
	private readonly repo: WidgetRepository
	private readonly botConfigService: BotConfigService
	private readonly providerConfigService: ProviderConfigService
	private readonly mcpService: McpService
	private readonly blacklistRepo: BlacklistRepository
	private readonly ragService?: Pick<RagService, "retrieve">
	private readonly streamResponse: StreamResponse
	private readonly sendQuotaAlertEmail: SendQuotaAlertEmail

	constructor(deps: WidgetServiceDeps) {
		this.repo = deps.widgetRepository
		this.botConfigService = deps.botConfigService
		this.providerConfigService = deps.providerConfigService
		this.mcpService = deps.mcpService
		this.blacklistRepo = deps.blacklistRepository
		this.ragService = deps.ragService
		this.streamResponse = deps.streamResponse ?? streamResponse
		this.sendQuotaAlertEmail =
			deps.sendQuotaAlertEmail ?? defaultSendQuotaAlertEmail
	}

	async createOrResumeSession(clientId: string, browserSessionId: string) {
		const { session, isNew } = await this.repo.findOrCreateSession(
			clientId,
			browserSessionId,
		)
		return { session, isNew }
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
		provider: string
		model: string
	}> {
		const dbMessages = await this.repo.getMessages(conversationId, clientId)
		if (!dbMessages) throw new NotFoundError("Conversation not found")
		if (dbMessages.length >= config.WIDGET_CONVERSATION_MAX_MESSAGES) {
			throw new BadRequestError(
				"CONVERSATION_LIMIT_REACHED",
				"Conversation limit reached — please start a new conversation",
			)
		}

		const clientSettings = await this.repo.getClientLimitSettings(clientId)
		if (
			clientSettings?.monthlyUsageLimit !== null &&
			clientSettings?.monthlyUsageLimit !== undefined
		) {
			const now = new Date()
			const monthlySpend = await this.repo.getMonthlySpend(
				clientId,
				now.getFullYear(),
				now.getMonth() + 1,
			)
			if (
				parseFloat(monthlySpend) >= parseFloat(clientSettings.monthlyUsageLimit)
			) {
				throw new BadRequestError(
					"MONTHLY_LIMIT_REACHED",
					"Monthly usage limit reached",
				)
			}
		}

		const { config: provider, isExternal } =
			await this.providerConfigService.resolveForAi(clientId)

		const botConfig = await this.botConfigService.getConfig(clientId)

		let chunks: string[] = []
		try {
			chunks = (await this.ragService?.retrieve(clientId, content, 5)) ?? []
		} catch (err) {
			logger.warn("RAG retrieval failed, continuing without context", {
				clientId,
				error: err instanceof Error ? err.message : String(err),
			})
		}

		const ragContext =
			chunks.length > 0
				? `\n\n<context>\n${chunks.join("\n---\n")}\n</context>`
				: ""

		const context = [
			PLATFORM_SYSTEM_PROMPT,
			botConfig?.systemPrompt,
			botConfig?.toneStyle ? `Tone: ${botConfig.toneStyle}` : undefined,
			ragContext || undefined,
		]
			.filter(Boolean)
			.join("\n")

		const mcpServers = await this.resolveMcpServers(clientId)

		const history = this.buildHistory(dbMessages)

		const userMessage = await this.repo.createMessage(
			conversationId,
			"user",
			content,
		)

		const blacklistWords = await this.blacklistRepo.listByClientId(clientId)

		const { stream, usage } = await this.streamResponse({
			userMessage: content,
			history,
			context,
			wordBlacklist: blacklistWords.map((w) => w.word),
			mcpServers,
			contextDirectory: "",
			provider,
			maxSteps: 10,
		})

		return {
			stream,
			userMessage,
			usage,
			isExternalProvider: isExternal,
			provider: provider.providerType,
			model: provider.model,
		}
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
			const now = new Date()
			const year = now.getFullYear()
			const month = now.getMonth() + 1

			const spendBefore = await this.repo.getMonthlySpend(clientId, year, month)
			await this.repo.recordUsage(
				clientId,
				assistantMessage.id,
				tokenCount,
				costUsd,
			)

			const clientSettings = await this.repo.getClientLimitSettings(clientId)
			if (clientSettings?.usageAlertThresholdUsd) {
				const threshold = parseFloat(clientSettings.usageAlertThresholdUsd)
				const spendAfter = await this.repo.getMonthlySpend(
					clientId,
					year,
					month,
				)
				if (
					parseFloat(spendBefore) < threshold &&
					parseFloat(spendAfter) >= threshold
				) {
					const limit = clientSettings.monthlyUsageLimit
						? parseFloat(clientSettings.monthlyUsageLimit)
						: null
					const usagePercent = limit
						? Math.min(100, Math.round((parseFloat(spendAfter) / limit) * 100))
						: 100
					this.sendQuotaAlertEmail(clientSettings.email, usagePercent).catch(
						(err) =>
							logger.warn("Quota alert email failed", {
								email: clientSettings.email,
								error: err,
							}),
					)
				}
			}
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

	private async resolveMcpServers(
		clientId: string,
	): Promise<McpServerConfig[]> {
		const custom = await this.mcpService.listCustomServers(clientId)
		const preMade = await this.mcpService.listEnabledPreMade(clientId)
		const configs: McpServerConfig[] = []
		for (const s of [...custom, ...preMade]) {
			const parsed = mcpServerConfigSchema.safeParse(s.mcpConfig)
			if (!parsed.success) {
				throw new BadRequestError(
					"MCP_CONFIG_INVALID",
					`Invalid MCP server config: ${parsed.error.issues.map(({ path, message }) => `${path.join(".")}: ${message}`).join(", ")}`,
				)
			}
			configs.push(parsed.data)
		}
		return configs
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
