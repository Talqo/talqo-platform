import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { LanguageModel } from "ai"
import type { AiProviderConfig } from "shared"
import { logger } from "@/common/logger"

export function createLanguageModel(config: AiProviderConfig): LanguageModel {
	switch (config.providerType) {
		case "openai":
			return createOpenAI({
				apiKey: config.apiKey,
				baseURL: config.baseUrl,
			})(config.model)
		case "openai_compatible":
			return createOpenAICompatible({
				name: "custom",
				apiKey: config.apiKey,
				baseURL: config.baseUrl,
			}).chatModel(config.model)
		case "google":
			return createGoogleGenerativeAI({
				apiKey: config.apiKey,
				baseURL: config.baseUrl,
			})(config.model)
		case "anthropic":
			return createAnthropic({
				apiKey: config.apiKey,
				baseURL: config.baseUrl,
			})(config.model)
		default: {
			// TypeScript will error here if a new AiProviderConfig variant is added without a case
			const _exhaustiveCheck: (_: never) => void = () => {}
			_exhaustiveCheck(config)
			const sanitized = {
				providerType: (config as AiProviderConfig).providerType,
				model: (config as AiProviderConfig).model,
			}
			logger.error("Unknown AI provider config", {
				config: sanitized,
			})
			throw new Error(
				`Unknown AI provider config: ${JSON.stringify(sanitized)}`,
			)
		}
	}
}
