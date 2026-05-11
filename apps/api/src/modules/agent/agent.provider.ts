import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { LanguageModel } from "ai"
import type { AiProviderConfig } from "shared"
import { logger } from "@/common/logger"

export function createLanguageModel(config: AiProviderConfig): LanguageModel {
	switch (config.type) {
		case "openai":
			return createOpenAI({
				apiKey: config.apiKey,
				baseURL: config.baseURL,
			})(config.model)
		case "openai_compatible":
			return createOpenAICompatible({
				name: "custom",
				apiKey: config.apiKey,
				baseURL: config.baseURL,
			}).chatModel(config.model)
		case "google":
			return createGoogleGenerativeAI({
				apiKey: config.apiKey,
				baseURL: config.baseURL,
			})(config.model)
		case "anthropic":
			return createAnthropic({
				apiKey: config.apiKey,
				baseURL: config.baseURL,
			})(config.model)
		default: {
			// TypeScript will error here if a new AiProviderConfig variant is added without a case
			const _exhaustive: never = config
			logger.error("Unknown AI provider config", {
				config: JSON.stringify(_exhaustive),
			})
			throw new Error(
				`Unknown AI provider config: ${JSON.stringify(_exhaustive)}`,
			)
		}
	}
}
