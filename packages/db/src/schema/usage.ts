import {
	index,
	integer,
	numeric,
	pgEnum,
	pgTable,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core"
import { clients } from "./client"
import { messages } from "./session"

export const usageTypeEnum = pgEnum("usage_type", ["message", "embedding"])

export const usageRecords = pgTable(
	"usage_records",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		clientId: uuid("client_id")
			.notNull()
			.references(() => clients.id, { onDelete: "cascade" }),
		messageId: uuid("message_id").references(() => messages.id, {
			onDelete: "cascade",
		}),
		type: usageTypeEnum("type").notNull().default("message"),
		tokensUsed: integer("tokens_used").notNull(),
		costUsd: numeric("cost_usd", {
			precision: 16,
			scale: 8,
			mode: "number",
		}).notNull(),
		recordedAt: timestamp("recorded_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		// Supersedes a client_id-only index — also covers monthly-spend SUMs
		index("usage_records_client_id_recorded_at_idx").on(
			table.clientId,
			table.recordedAt,
		),
	],
)
