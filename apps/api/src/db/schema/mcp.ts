import { jsonb, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { clients } from "./client";

export const customMcpServers = pgTable("custom_mcp_servers", {
	id: uuid("id").primaryKey().defaultRandom(),
	clientId: uuid("client_id")
		.notNull()
		.references(() => clients.id, { onDelete: "cascade" }),
	mcpConfig: jsonb("mcp_config").notNull(),
});

export const preMadeMcpServers = pgTable("pre_made_mcp_servers", {
	id: uuid("id").primaryKey().defaultRandom(),
	mcpConfig: jsonb("mcp_config").notNull(),
});

// Join table: clients can use any number of pre-made MCP servers
export const clientPreMadeMcp = pgTable(
	"client_pre_made_mcp",
	{
		clientId: uuid("client_id")
			.notNull()
			.references(() => clients.id, { onDelete: "cascade" }),
		preMadeMcpId: uuid("pre_made_mcp_id")
			.notNull()
			.references(() => preMadeMcpServers.id, { onDelete: "cascade" }),
	},
	(t) => [primaryKey({ columns: [t.clientId, t.preMadeMcpId] })],
);
