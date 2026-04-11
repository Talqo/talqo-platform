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

export type AiProviderConfig = {
	type: "openai" | "openai_compatible" | "google" | "anthropic"
	apiKey: string
	model: string
	baseURL?: string // required when type === 'openai_compatible'
}
