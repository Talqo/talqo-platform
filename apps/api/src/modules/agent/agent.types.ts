import type { AiProviderConfig, McpServerConfig } from "shared"

export type AiServiceInput = {
	userMessage: string
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

export type AiServiceOutput = {
	message: string
	tokensUsed: TokenUsage
	blocked: boolean
}
