import { sql } from "drizzle-orm"
import {
	check,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core"
import { clients } from "./client"

export const endUserSessions = pgTable(
	"end_user_sessions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		clientId: uuid("client_id")
			.notNull()
			.references(() => clients.id, { onDelete: "cascade" }),
		browserSessionId: varchar("browser_session_id", { length: 255 }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		lastActiveAt: timestamp("last_active_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		unique("end_user_sessions_client_id_browser_session_id_unique").on(
			table.clientId,
			table.browserSessionId,
		),
	],
)

export const conversations = pgTable(
	"conversations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		sessionId: uuid("session_id")
			.notNull()
			.references(() => endUserSessions.id, { onDelete: "cascade" }),
		clientId: uuid("client_id")
			.notNull()
			.references(() => clients.id, { onDelete: "cascade" }),
		startedAt: timestamp("started_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		satisfactionRating: integer("satisfaction_rating"),
	},
	(table) => [
		check(
			"conversations_satisfaction_rating_range",
			sql`${table.satisfactionRating} >= 1 AND ${table.satisfactionRating} <= 5`,
		),
	],
)

export const messageRoleEnum = pgEnum("message_role", [
	"user",
	"assistant",
	"system",
])

export const messages = pgTable(
	"messages",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		conversationId: uuid("conversation_id")
			.notNull()
			.references(() => conversations.id, { onDelete: "cascade" }),
		role: messageRoleEnum("role").notNull(),
		content: text("content").notNull(),
		tokenCount: integer("token_count").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("messages_conversation_id_created_at_idx").on(
			table.conversationId,
			table.createdAt,
		),
	],
)
