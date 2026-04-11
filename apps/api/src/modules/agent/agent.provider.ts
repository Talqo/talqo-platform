import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { LanguageModel } from "ai"
import type { AiProviderConfig } from "shared"

export function createLanguageModel(config: AiProviderConfig): LanguageModel {
	switch (config.type) {
		case "openai":
			return createOpenAI({ apiKey: config.apiKey, baseURL: config.baseURL })(
				config.model,
			)
		case "openai_compatible":
			return createOpenAICompatible({
				name: "custom",
				apiKey: config.apiKey,
				baseURL: config.baseURL ?? "",
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
	}
}
