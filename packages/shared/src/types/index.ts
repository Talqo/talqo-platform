export type ApiResponse = {
	message: string;
	success: boolean;
};

export type {
	AiProviderConfig,
	McpHttpConfig,
	McpServerConfig,
	McpSseConfig,
	McpStdioConfig,
} from "./agent";
