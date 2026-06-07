import type { MCPClient } from "@ai-sdk/mcp"
import { createMCPClient } from "@ai-sdk/mcp"
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio"
import type { ToolSet } from "ai"
import type { McpServerConfig } from "shared"
import { logger } from "@/common/logger"

export type McpConnection = {
	tools: ToolSet
	close: () => Promise<void>
}

function createTransport(config: McpServerConfig) {
	switch (config.type) {
		case "stdio":
			return new Experimental_StdioMCPTransport({
				command: config.command,
				args: config.args,
				env: config.env,
			})
		case "http":
			return {
				type: "http" as const,
				url: config.url,
				headers: config.headers,
			}
	}
}

export async function verifyMcpServer(
	config: McpServerConfig,
): Promise<{ ok: true; tools: string[] } | { ok: false; error: string }> {
	let client: MCPClient | undefined
	try {
		client = await createMCPClient({
			transport: createTransport(config),
		})
		const toolSet = await client.tools()
		return { ok: true, tools: Object.keys(toolSet) }
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : String(err),
		}
	} finally {
		if (client) await client.close()
	}
}

export async function connectMcpServers(
	configs: McpServerConfig[],
): Promise<McpConnection> {
	const clients: MCPClient[] = []
	let mergedTools: ToolSet = {}

	for (const config of configs) {
		try {
			const client = await createMCPClient({
				transport: createTransport(config),
			})
			clients.push(client)
			const tools = await client.tools()
			for (const name of Object.keys(tools)) {
				if (name in mergedTools) {
					logger.warn("MCP tool name collision", {
						name,
						overwrittenBy: config.type,
					})
				}
			}
			mergedTools = { ...mergedTools, ...tools }
		} catch (error) {
			logger.error("Failed to connect to MCP server", {
				type: config.type,
				message: error instanceof Error ? error.message : String(error),
			})
		}
	}

	return {
		tools: mergedTools,
		close: async () => {
			await Promise.allSettled(clients.map((c) => c.close()))
		},
	}
}
