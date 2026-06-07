import type { ModelMessage } from "ai"
import type { AiProviderConfig, McpServerConfig } from "shared"

export type AiServiceInput = {
	userMessage: string
	history?: ModelMessage[]
	context: string
	wordBlacklist: string[]
	mcpServers: McpServerConfig[]
	contextDirectory: string
	provider: AiProviderConfig
	maxSteps?: number
}

export type TokenUsage = {
	input: number
	output: number
}
