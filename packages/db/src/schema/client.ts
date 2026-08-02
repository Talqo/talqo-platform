import { sql } from "drizzle-orm"
import {
	boolean,
	integer,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core"

export const providerTypeEnum = pgEnum("provider_type", [
	"openai",
	"openai_compatible",
	"google",
	"anthropic",
])

export const pendingRegistrations = pgTable(
	"pending_registrations",
	{
		token: uuid("token").primaryKey().defaultRandom(),
		name: varchar("name", { length: 255 }).notNull(),
		email: varchar("email", { length: 255 }).notNull().unique(),
		passwordHash: varchar("password_hash", { length: 255 }).notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		consumedAt: timestamp("consumed_at", { withTimezone: true }),
		consumedByClientId: uuid("consumed_by_client_id").references(
			() => clients.id,
		),
	},
	(_table) => ({
		checkConsumedState: sql`
			CHECK (
				(consumed_at IS NULL AND consumed_by_client_id IS NULL) OR
				(consumed_at IS NOT NULL AND consumed_by_client_id IS NOT NULL)
			)
		`.as("check_consumed_state"),
	}),
)

export const clients = pgTable("clients", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: varchar("name", { length: 255 }).notNull(),
	email: varchar("email", { length: 255 }).notNull().unique(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	balanceUsd: numeric("balance_usd", {
		precision: 16,
		scale: 8,
		mode: "number",
	})
		.notNull()
		.default(10),
	monthlyUsageLimit: numeric("monthly_usage_limit", {
		precision: 16,
		scale: 8,
		mode: "number",
	}),
	usageAlertThresholdUsd: numeric("usage_alert_threshold_usd", {
		precision: 16,
		scale: 8,
		mode: "number",
	}),
	// Token scoping widget requests to this client (never exposed to the dashboard UI)
	widgetToken: uuid("widget_token").notNull().unique().defaultRandom(),
	// Incremented on password reset to invalidate all previously issued JWTs
	tokenVersion: integer("token_version").notNull().default(0),
	status: varchar("status", { length: 50 }).notNull().default("active"),
	lastActive: timestamp("last_active", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	widgetSetupDismissed: boolean("widget_setup_dismissed")
		.notNull()
		.default(false),
})

export const passwordResetTokens = pgTable("password_reset_tokens", {
	token: uuid("token").primaryKey().defaultRandom(),
	email: varchar("email", { length: 255 }).notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	consumedAt: timestamp("consumed_at", { withTimezone: true }),
})

export const aiProviderConfigs = pgTable("ai_provider_configs", {
	id: uuid("id").primaryKey().defaultRandom(),
	clientId: uuid("client_id")
		.notNull()
		.unique()
		.references(() => clients.id, { onDelete: "cascade" }),
	providerType: providerTypeEnum("provider_type").notNull(),
	apiKeyEncrypted: text("api_key_encrypted").notNull(),
	model: varchar("model", { length: 255 }).notNull(),
	embeddingModel: varchar("embedding_model", { length: 255 }),
	baseUrl: text("base_url"),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
})

export const botConfigs = pgTable("bot_configs", {
	id: uuid("id").primaryKey().defaultRandom(),
	clientId: uuid("client_id")
		.notNull()
		.unique()
		.references(() => clients.id, { onDelete: "cascade" }),
	systemPrompt: text("system_prompt"),
	defaultRole: varchar("default_role", { length: 255 }),
	toneStyle: varchar("tone_style", { length: 255 }),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
})

export const widgetConfigs = pgTable("widget_configs", {
	id: uuid("id").primaryKey().defaultRandom(),
	clientId: uuid("client_id")
		.notNull()
		.unique()
		.references(() => clients.id, { onDelete: "cascade" }),
	botName: varchar("bot_name", { length: 255 })
		.notNull()
		.default("AI Assistant"),
	position: varchar("position", { length: 10 }).notNull().default("right"),
	lightColors: jsonb("light_colors").$type<Record<string, string>>().notNull(),
	darkColors: jsonb("dark_colors").$type<Record<string, string>>().notNull(),
	icons: jsonb("icons").$type<Record<string, string>>().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
})
