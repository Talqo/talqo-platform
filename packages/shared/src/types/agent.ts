export type McpStdioConfig = {
	type: "stdio"
	command: string
	args?: string[]
	env?: Record<string, string>
}

export type McpHttpConfig = {
	type: "http"
	url: string
	headers?: Record<string, string>
}

export type McpServerConfig = McpStdioConfig | McpHttpConfig

type BaseConfig = {
	apiKey: string
	model: string
	embeddingModel?: string
}

export type AiProviderConfig =
	| ({ providerType: "openai_compatible"; baseUrl: string } & BaseConfig)
	| ({ providerType: "openai"; baseUrl?: string } & BaseConfig)
	| ({ providerType: "google"; baseUrl?: string } & BaseConfig)
	| ({ providerType: "anthropic"; baseUrl?: string } & BaseConfig)
