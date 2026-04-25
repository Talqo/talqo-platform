import { generateResponse, streamResponse } from "./agent.service"
import type { AiServiceInput, AiServiceOutput, TokenUsage } from "./agent.types"

export type AgentPort = {
	generateResponse(input: AiServiceInput): Promise<AiServiceOutput>
	streamResponse(
		input: AiServiceInput,
	): Promise<{ stream: ReadableStream<string>; usage: Promise<TokenUsage> }>
}

export const defaultAgentPort: AgentPort = {
	generateResponse,
	streamResponse,
}
