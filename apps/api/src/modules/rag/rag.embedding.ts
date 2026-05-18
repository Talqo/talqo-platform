import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { EmbeddingModel } from "ai"
import type { AiProviderConfig } from "shared"
import { config } from "@/common/config"

function createOpenAICompatibleEmbedding(
	options: { name: string; baseURL: string; apiKey: string },
	modelId: string,
): EmbeddingModel {
	return createOpenAICompatible(options).embeddingModel(modelId)
}

export function createEmbeddingModel(
	providerConfig: AiProviderConfig,
): EmbeddingModel {
	switch (providerConfig.type) {
		case "openai": {
			if (!providerConfig.embeddingModel) {
				throw new Error("embeddingModel is required for openai provider")
			}
			return createOpenAI({ apiKey: providerConfig.apiKey }).embeddingModel(
				providerConfig.embeddingModel,
			)
		}
		case "google": {
			if (!providerConfig.embeddingModel) {
				throw new Error("embeddingModel is required for google provider")
			}
			return createGoogleGenerativeAI({
				apiKey: providerConfig.apiKey,
			}).embeddingModel(providerConfig.embeddingModel)
		}
		case "openai_compatible": {
			if (!providerConfig.embeddingModel) {
				throw new Error(
					"embeddingModel is required for openai_compatible provider",
				)
			}
			return createOpenAICompatibleEmbedding(
				{
					name: "custom",
					baseURL: providerConfig.baseURL,
					apiKey: providerConfig.apiKey,
				},
				providerConfig.embeddingModel,
			)
		}
		case "anthropic": {
			// Anthropic has no native embedding API — always use the server-side
			// OpenAI-compatible endpoint (DEFAULT_LLM_BASE_URL + DEFAULT_LLM_API_KEY).
			const modelId = config.DEFAULT_EMBEDDING_MODEL
			if (!modelId) {
				throw new Error(
					"DEFAULT_EMBEDDING_MODEL env var is required when using Anthropic provider",
				)
			}
			if (!config.DEFAULT_LLM_BASE_URL) {
				throw new Error(
					"DEFAULT_LLM_BASE_URL env var is required when using Anthropic provider",
				)
			}
			if (!config.DEFAULT_LLM_API_KEY) {
				throw new Error(
					"DEFAULT_LLM_API_KEY env var is required when using Anthropic provider",
				)
			}
			return createOpenAICompatibleEmbedding(
				{
					name: "default",
					baseURL: config.DEFAULT_LLM_BASE_URL,
					apiKey: config.DEFAULT_LLM_API_KEY,
				},
				modelId,
			)
		}
		default:
			throw new Error("Unknown AI provider config")
	}
}
