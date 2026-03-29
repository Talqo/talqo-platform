import type { MCPClient } from "@ai-sdk/mcp";
import { createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import type { ToolSet } from "ai";
import type { McpServerConfig } from "shared";

export type McpConnection = {
	tools: ToolSet;
	close: () => Promise<void>;
};

function createTransport(config: McpServerConfig) {
	switch (config.type) {
		case "stdio":
			return new Experimental_StdioMCPTransport({
				command: config.command,
				args: config.args,
				env: config.env,
			});
		case "sse":
			return { type: "sse" as const, url: config.url, headers: config.headers };
		case "http":
			return {
				type: "http" as const,
				url: config.url,
				headers: config.headers,
			};
	}
}

export async function connectMcpServers(
	configs: McpServerConfig[],
): Promise<McpConnection> {
	const clients: MCPClient[] = [];
	let mergedTools: ToolSet = {};

	for (const config of configs) {
		try {
			const client = await createMCPClient({
				transport: createTransport(config),
			});
			clients.push(client);
			const tools = await client.tools();
			for (const name of Object.keys(tools)) {
				if (name in mergedTools) {
					console.warn(
						`MCP tool name collision: "${name}" will be overwritten by ${config.type} server`,
					);
				}
			}
			mergedTools = { ...mergedTools, ...tools };
		} catch (error) {
			console.error(`Failed to connect to MCP server (${config.type}):`, error);
		}
	}

	return {
		tools: mergedTools,
		close: async () => {
			await Promise.allSettled(clients.map((c) => c.close()));
		},
	};
}
