import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import type { AiProviderConfig } from "shared";

export function createLanguageModel(config: AiProviderConfig): LanguageModel {
	const provider = createOpenAICompatible({
		name: "user-provider",
		baseURL: config.baseUrl,
		apiKey: config.apiKey,
	});
	return provider.chatModel(config.model);
}
