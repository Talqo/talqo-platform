import { createSelectSchema } from "drizzle-zod"
import { z } from "zod"
import { customMcpServers, preMadeMcpServers } from "@/schema/mcp"

// mcpConfig is JSONB — keep as z.unknown() to avoid coupling to McpServerConfig shape
export const preMadeServerResponseSchema = createSelectSchema(
	preMadeMcpServers,
	{
		mcpConfig: z.unknown(),
		name: z.string(),
		description: z.string().nullable(),
	},
)

export const customServerResponseSchema = createSelectSchema(customMcpServers, {
	mcpConfig: z.unknown(),
})

export type PreMadeServerResponse = z.infer<typeof preMadeServerResponseSchema>
export type CustomServerResponse = z.infer<typeof customServerResponseSchema>
