export type McpStdioConfig = {
	type: "stdio"
	command: string
	args?: string[]
	env?: Record<string, string>
}

export type McpSseConfig = {
	type: "sse"
	url: string
	headers?: Record<string, string>
}

export type McpHttpConfig = {
	type: "http"
	url: string
	headers?: Record<string, string>
}

export type McpServerConfig = McpStdioConfig | McpSseConfig | McpHttpConfig

export type ProviderType =
	| "openai"
	| "openai_compatible"
	| "google"
	| "anthropic"

type BaseConfig = {
	apiKey: string
	model: string
}

export type AiProviderConfig =
	| ({ type: "openai_compatible"; baseURL: string } & BaseConfig)
	| ({ type: "openai"; baseURL?: string } & BaseConfig)
	| ({ type: "google"; baseURL?: string } & BaseConfig)
	| ({ type: "anthropic"; baseURL?: string } & BaseConfig)
