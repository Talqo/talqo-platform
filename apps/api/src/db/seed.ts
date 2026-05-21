import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { logger } from "@/common/logger"
import * as schema from "./schema"
import {
	adminAccessLogs,
	adminUsers,
	blacklistWords,
	botConfigs,
	clientPreMadeMcp,
	clients,
	conversations,
	customMcpServers,
	endUserSessions,
	messages,
	preMadeMcpServers,
	usageRecords,
} from "./schema"

// Connect directly — JWT_SECRET is not needed for seeding
const {
	POSTGRES_USER,
	POSTGRES_PASSWORD,
	POSTGRES_HOST = "localhost",
	POSTGRES_PORT = "5432",
	POSTGRES_DB,
} = process.env

if (!POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_DB) {
	logger.error(
		"Missing required env vars: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB",
	)
	process.exit(1)
}

const pgClient = postgres(
	`postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`,
	{ max: 1 },
)
const db = drizzle(pgClient, { schema })

// Fixed UUIDs make the seed fully idempotent — re-running never creates duplicates.
// Uses version 4 (4xxx) + variant 1 (8xxx) to satisfy RFC 4122 UUID validation.
const ID = {
	// Admin
	admin: "00000000-0000-4000-8000-000000000001",
	// Clients
	client1: "00000000-0000-4000-8000-000000000010",
	client2: "00000000-0000-4000-8000-000000000011",
	// Bot configs
	botConfig1: "00000000-0000-4000-8000-000000000020",
	botConfig2: "00000000-0000-4000-8000-000000000021",
	// MCP servers
	preMadeMcp1: "00000000-0000-4000-8000-000000000030",
	preMadeMcp2: "00000000-0000-4000-8000-000000000031",
	customMcp1: "00000000-0000-4000-8000-000000000032",
	// Blacklist words
	blacklist1: "00000000-0000-4000-8000-000000000040",
	blacklist2: "00000000-0000-4000-8000-000000000041",
	blacklist3: "00000000-0000-4000-8000-000000000042",
	blacklist4: "00000000-0000-4000-8000-000000000043",
	// Admin access logs
	accessLog1: "00000000-0000-4000-8000-000000000050",
	accessLog2: "00000000-0000-4000-8000-000000000051",
	accessLog3: "00000000-0000-4000-8000-000000000052",
	// End user sessions
	session1: "00000000-0000-4000-8000-000000000060",
	session2: "00000000-0000-4000-8000-000000000061",
	session3: "00000000-0000-4000-8000-000000000062",
	// Conversations
	conv1: "00000000-0000-4000-8000-000000000070",
	conv2: "00000000-0000-4000-8000-000000000071",
	conv3: "00000000-0000-4000-8000-000000000072",
	// Messages
	msg1: "00000000-0000-4000-8000-000000000080",
	msg2: "00000000-0000-4000-8000-000000000081",
	msg3: "00000000-0000-4000-8000-000000000082",
	msg4: "00000000-0000-4000-8000-000000000083",
	msg5: "00000000-0000-4000-8000-000000000084",
	msg6: "00000000-0000-4000-8000-000000000085",
	msg7: "00000000-0000-4000-8000-000000000086",
	msg8: "00000000-0000-4000-8000-000000000087",
	// Usage records (one per assistant message)
	usage1: "00000000-0000-4000-8000-000000000090",
	usage2: "00000000-0000-4000-8000-000000000091",
	usage3: "00000000-0000-4000-8000-000000000092",
	usage4: "00000000-0000-4000-8000-000000000093",
	// Widget tokens
	widgetToken1: "00000000-0000-4000-8001-000000000010",
	widgetToken2: "00000000-0000-4000-8001-000000000011",
} as const

async function seed() {
	logger.info("Seeding database...")

	// Wipe all data so the seed is always a clean re-insert regardless of prior state.
	// CASCADE handles FK ordering automatically.
	await db.execute(
		sql`TRUNCATE admin_users, clients, pre_made_mcp_servers CASCADE`,
	)

	// ── Admin users ────────────────────────────────────────────────────────────
	await db
		.insert(adminUsers)
		.values({
			id: ID.admin,
			email: "admin@pagepal.dev",
			passwordHash: await Bun.password.hash("admin123"),
		})
		.onConflictDoUpdate({
			target: adminUsers.email,
			set: { passwordHash: await Bun.password.hash("admin123") },
		})
	logger.info("  ✓ admin users")

	// ── Clients ────────────────────────────────────────────────────────────────
	await db
		.insert(clients)
		.values([
			{
				id: ID.client1,
				name: "Acme Corp",
				email: "acme@pagepal.dev",
				passwordHash: await Bun.password.hash("client123"),
				balanceUsd: "100.0000",
				monthlyUsageLimit: "50.0000",
				usageAlertThresholdUsd: "40.0000",
				widgetToken: ID.widgetToken1,
				status: "active",
				widgetSetupDismissed: true,
			},
			{
				id: ID.client2,
				name: "TechStartup",
				email: "tech@pagepal.dev",
				passwordHash: await Bun.password.hash("client123"),
				balanceUsd: "250.0000",
				widgetToken: ID.widgetToken2,
				status: "active",
				widgetSetupDismissed: true,
			},
		])
		.onConflictDoUpdate({
			target: clients.email,
			set: {
				name: sql`excluded.name`,
				passwordHash: sql`excluded.password_hash`,
				balanceUsd: sql`excluded.balance_usd`,
				monthlyUsageLimit: sql`excluded.monthly_usage_limit`,
				usageAlertThresholdUsd: sql`excluded.usage_alert_threshold_usd`,
				widgetToken: sql`excluded.widget_token`,
				status: sql`excluded.status`,
				widgetSetupDismissed: sql`excluded.widget_setup_dismissed`,
			},
		})
	logger.info("  ✓ clients")

	// ── Bot configs ────────────────────────────────────────────────────────────
	await db
		.insert(botConfigs)
		.values([
			{
				id: ID.botConfig1,
				clientId: ID.client1,
				systemPrompt:
					"You are a helpful shopping assistant for Acme Corp. Help customers find products, answer questions about availability, and guide them through the purchase process.",
				defaultRole: "Shopping Assistant",
				toneStyle: "friendly",
			},
			{
				id: ID.botConfig2,
				clientId: ID.client2,
				systemPrompt:
					"You are a technical support specialist for TechStartup. Help users troubleshoot issues, explain features, and escalate complex problems when needed.",
				defaultRole: "Support Agent",
				toneStyle: "professional",
			},
		])
		.onConflictDoNothing()
	logger.info("  ✓ bot configs")

	// ── Pre-made MCP servers ───────────────────────────────────────────────────
	await db
		.insert(preMadeMcpServers)
		.values([
			{
				id: ID.preMadeMcp1,
				name: "Everything",
				description:
					"Reference MCP server with tools, prompts, resources, and sampling",
				mcpConfig: {
					type: "stdio",
					command: "bunx",
					args: ["-y", "@modelcontextprotocol/server-everything"],
				},
			},
			{
				id: ID.preMadeMcp2,
				name: "Memory",
				description:
					"Persistent knowledge graph for storing and retrieving information",
				mcpConfig: {
					type: "stdio",
					command: "bunx",
					args: ["-y", "@modelcontextprotocol/server-memory"],
				},
			},
		])
		.onConflictDoNothing()
	logger.info("  ✓ pre-made MCP servers")

	// ── Client ↔ pre-made MCP associations ────────────────────────────────────
	await db
		.insert(clientPreMadeMcp)
		.values([
			{ clientId: ID.client1, preMadeMcpId: ID.preMadeMcp1 },
			{ clientId: ID.client2, preMadeMcpId: ID.preMadeMcp1 },
			{ clientId: ID.client2, preMadeMcpId: ID.preMadeMcp2 },
		])
		.onConflictDoNothing()
	logger.info("  ✓ client MCP associations")

	// ── Custom MCP servers ─────────────────────────────────────────────────────
	await db
		.insert(customMcpServers)
		.values([
			{
				id: ID.customMcp1,
				clientId: ID.client1,
				mcpConfig: {
					type: "http",
					name: "Acme Inventory",
					description: "Internal product inventory lookup for Acme Corp",
					url: "https://mcp.acme.example/inventory",
				},
			},
		])
		.onConflictDoNothing()
	logger.info("  ✓ custom MCP servers")

	// ── Blacklist words ────────────────────────────────────────────────────────
	await db
		.insert(blacklistWords)
		.values([
			{ id: ID.blacklist1, clientId: ID.client1, word: "competitor" },
			{ id: ID.blacklist2, clientId: ID.client1, word: "refund" },
			{ id: ID.blacklist3, clientId: ID.client2, word: "lawsuit" },
			{ id: ID.blacklist4, clientId: ID.client2, word: "outage" },
		])
		.onConflictDoNothing()
	logger.info("  ✓ blacklist words")

	// ── Admin access logs ──────────────────────────────────────────────────────
	await db
		.insert(adminAccessLogs)
		.values([
			{
				id: ID.accessLog1,
				adminId: ID.admin,
				clientId: ID.client1,
				actionType: "view_client",
			},
			{
				id: ID.accessLog2,
				adminId: ID.admin,
				clientId: ID.client1,
				actionType: "update_balance",
			},
			{
				id: ID.accessLog3,
				adminId: ID.admin,
				clientId: ID.client2,
				actionType: "view_client",
			},
		])
		.onConflictDoNothing()
	logger.info("  ✓ admin access logs")

	// ── End user sessions ──────────────────────────────────────────────────────
	await db
		.insert(endUserSessions)
		.values([
			{
				id: ID.session1,
				clientId: ID.client1,
				browserSessionId: "browser-sess-acme-001",
			},
			{
				id: ID.session2,
				clientId: ID.client1,
				browserSessionId: "browser-sess-acme-002",
			},
			{
				id: ID.session3,
				clientId: ID.client2,
				browserSessionId: "browser-sess-tech-001",
			},
		])
		.onConflictDoNothing()
	logger.info("  ✓ end user sessions")

	// ── Conversations ──────────────────────────────────────────────────────────
	await db
		.insert(conversations)
		.values([
			{
				id: ID.conv1,
				sessionId: ID.session1,
				clientId: ID.client1,
				satisfactionRating: 5,
			},
			{
				id: ID.conv2,
				sessionId: ID.session2,
				clientId: ID.client1,
				satisfactionRating: 3,
			},
			{
				id: ID.conv3,
				sessionId: ID.session3,
				clientId: ID.client2,
				// no rating yet — user did not submit feedback
			},
		])
		.onConflictDoNothing()
	logger.info("  ✓ conversations")

	// ── Messages ───────────────────────────────────────────────────────────────
	await db
		.insert(messages)
		.values([
			// conv1 — Acme Corp shopping session
			{
				id: ID.msg1,
				conversationId: ID.conv1,
				role: "user",
				content: "Do you have wireless headphones in stock?",
				tokenCount: 10,
			},
			{
				id: ID.msg2,
				conversationId: ID.conv1,
				role: "assistant",
				content:
					"Yes! We currently have several wireless headphone models in stock. Our most popular is the SoundPro X3 at $79.99, and the premium NoiseShield Elite at $149.99. Would you like more details on either?",
				tokenCount: 450,
			},
			{
				id: ID.msg3,
				conversationId: ID.conv1,
				role: "user",
				content: "Tell me more about the NoiseShield Elite.",
				tokenCount: 9,
			},
			{
				id: ID.msg4,
				conversationId: ID.conv1,
				role: "assistant",
				content:
					"The NoiseShield Elite features 40-hour battery life, active noise cancellation, and foldable design. It comes in black and midnight blue. Want me to add it to your cart?",
				tokenCount: 380,
			},
			// conv2 — Acme Corp second session
			{
				id: ID.msg5,
				conversationId: ID.conv2,
				role: "user",
				content: "What is your return policy?",
				tokenCount: 7,
			},
			{
				id: ID.msg6,
				conversationId: ID.conv2,
				role: "assistant",
				content:
					"We offer a 30-day return window for most items in original condition. Electronics must be unopened. You can start a return from your account dashboard.",
				tokenCount: 350,
			},
			// conv3 — TechStartup support session
			{
				id: ID.msg7,
				conversationId: ID.conv3,
				role: "user",
				content: "My API key is not working after I regenerated it.",
				tokenCount: 12,
			},
			{
				id: ID.msg8,
				conversationId: ID.conv3,
				role: "assistant",
				content:
					"After regenerating your API key, the old key is immediately invalidated. Make sure you've updated the key in all your environments. If it still doesn't work after 5 minutes, please open a support ticket with your account ID.",
				tokenCount: 520,
			},
		])
		.onConflictDoNothing()
	logger.info("  ✓ messages")

	// ── Usage records (one per assistant message) ──────────────────────────────
	// Token counts and costs scaled to realistic LLM values ($0.10/1K tokens)
	await db
		.insert(usageRecords)
		.values([
			{
				id: ID.usage1,
				clientId: ID.client1,
				messageId: ID.msg2,
				tokensUsed: 450,
				costUsd: "0.0450",
			},
			{
				id: ID.usage2,
				clientId: ID.client1,
				messageId: ID.msg4,
				tokensUsed: 380,
				costUsd: "0.0380",
			},
			{
				id: ID.usage3,
				clientId: ID.client1,
				messageId: ID.msg6,
				tokensUsed: 350,
				costUsd: "0.0350",
			},
			{
				id: ID.usage4,
				clientId: ID.client2,
				messageId: ID.msg8,
				tokensUsed: 520,
				costUsd: "0.0520",
			},
		])
		.onConflictDoNothing()
	logger.info("  ✓ usage records")

	// ── Historical analytics data ──────────────────────────────────────────────
	// Timestamps are relative to seed-run time so they always fall inside the
	// default 30-day chart window. count = conversations per day — varies the
	// "Questions Asked" chart. Tokens scaled to realistic LLM values (~1K/msg).
	const now = Date.now()
	const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000)
	// Deterministic UUIDs: group selects the 4th UUID segment, i the last.
	const hid = (group: string, i: number) =>
		`00000000-0000-4000-8${group}00-${String(i).padStart(12, "0")}`

	const HIST_SESSION_1 = hid("1", 1)
	const HIST_SESSION_2 = hid("1", 2)

	await db
		.insert(endUserSessions)
		.values([
			{
				id: HIST_SESSION_1,
				clientId: ID.client1,
				browserSessionId: "hist-browser-acme",
			},
			{
				id: HIST_SESSION_2,
				clientId: ID.client2,
				browserSessionId: "hist-browser-tech",
			},
		])
		.onConflictDoNothing()

	const histPoints = [
		{
			d: 28,
			clientId: ID.client1,
			sessionId: HIST_SESSION_1,
			t: 1200,
			cost: "0.1200",
			rating: 4,
			count: 2,
		},
		{
			d: 27,
			clientId: ID.client2,
			sessionId: HIST_SESSION_2,
			t: 800,
			cost: "0.0800",
			rating: 5,
			count: 1,
		},
		{
			d: 26,
			clientId: ID.client1,
			sessionId: HIST_SESSION_1,
			t: 950,
			cost: "0.0950",
			rating: undefined,
			count: 3,
		},
		{
			d: 25,
			clientId: ID.client2,
			sessionId: HIST_SESSION_2,
			t: 600,
			cost: "0.0600",
			rating: 3,
			count: 1,
		},
		{
			d: 24,
			clientId: ID.client1,
			sessionId: HIST_SESSION_1,
			t: 1400,
			cost: "0.1400",
			rating: 5,
			count: 4,
		},
		{
			d: 23,
			clientId: ID.client2,
			sessionId: HIST_SESSION_2,
			t: 750,
			cost: "0.0750",
			rating: 2,
			count: 2,
		},
		{
			d: 22,
			clientId: ID.client1,
			sessionId: HIST_SESSION_1,
			t: 1100,
			cost: "0.1100",
			rating: 4,
			count: 3,
		},
		{
			d: 21,
			clientId: ID.client2,
			sessionId: HIST_SESSION_2,
			t: 500,
			cost: "0.0500",
			rating: undefined,
			count: 1,
		},
		{
			d: 19,
			clientId: ID.client1,
			sessionId: HIST_SESSION_1,
			t: 1300,
			cost: "0.1300",
			rating: 5,
			count: 2,
		},
		{
			d: 18,
			clientId: ID.client2,
			sessionId: HIST_SESSION_2,
			t: 900,
			cost: "0.0900",
			rating: 4,
			count: 3,
		},
		{
			d: 16,
			clientId: ID.client1,
			sessionId: HIST_SESSION_1,
			t: 850,
			cost: "0.0850",
			rating: undefined,
			count: 2,
		},
		{
			d: 15,
			clientId: ID.client2,
			sessionId: HIST_SESSION_2,
			t: 1000,
			cost: "0.1000",
			rating: 3,
			count: 1,
		},
		{
			d: 13,
			clientId: ID.client1,
			sessionId: HIST_SESSION_1,
			t: 1150,
			cost: "0.1150",
			rating: 5,
			count: 3,
		},
		{
			d: 12,
			clientId: ID.client2,
			sessionId: HIST_SESSION_2,
			t: 700,
			cost: "0.0700",
			rating: 4,
			count: 2,
		},
		{
			d: 10,
			clientId: ID.client1,
			sessionId: HIST_SESSION_1,
			t: 1250,
			cost: "0.1250",
			rating: 3,
			count: 4,
		},
		{
			d: 8,
			clientId: ID.client2,
			sessionId: HIST_SESSION_2,
			t: 550,
			cost: "0.0550",
			rating: 5,
			count: 1,
		},
		{
			d: 7,
			clientId: ID.client1,
			sessionId: HIST_SESSION_1,
			t: 950,
			cost: "0.0950",
			rating: undefined,
			count: 2,
		},
		{
			d: 5,
			clientId: ID.client2,
			sessionId: HIST_SESSION_2,
			t: 800,
			cost: "0.0800",
			rating: 4,
			count: 3,
		},
		{
			d: 3,
			clientId: ID.client1,
			sessionId: HIST_SESSION_1,
			t: 1450,
			cost: "0.1450",
			rating: 5,
			count: 5,
		},
		{
			d: 1,
			clientId: ID.client2,
			sessionId: HIST_SESSION_2,
			t: 650,
			cost: "0.0650",
			rating: 3,
			count: 2,
		},
	]

	// Flatten each histPoint into `count` individual events; only the first
	// event per day carries the satisfaction rating.
	const histEvents = histPoints.flatMap((p) =>
		Array.from({ length: p.count }, (_, j) => ({
			d: p.d,
			clientId: p.clientId,
			sessionId: p.sessionId,
			t: p.t,
			cost: p.cost,
			rating: j === 0 ? p.rating : undefined,
		})),
	)

	await db
		.insert(conversations)
		.values(
			histEvents.map((e, i) => ({
				id: hid("2", i + 1),
				sessionId: e.sessionId,
				clientId: e.clientId,
				startedAt: daysAgo(e.d),
				satisfactionRating: e.rating,
			})),
		)
		.onConflictDoNothing()

	const USER_QUESTIONS = [
		"How can I get help with this?",
		"Can you explain how this works?",
		"What are my options here?",
		"I need assistance with my account.",
		"Could you help me find what I need?",
	]

	await db
		.insert(messages)
		.values([
			...histEvents.map((e, i) => ({
				id: hid("3", i + 1),
				conversationId: hid("2", i + 1),
				role: "user" as const,
				content: USER_QUESTIONS[i % USER_QUESTIONS.length],
				tokenCount: 80,
				createdAt: daysAgo(e.d),
			})),
			...histEvents.map((e, i) => ({
				id: hid("4", i + 1),
				conversationId: hid("2", i + 1),
				role: "assistant" as const,
				content: "Historical assistant response.",
				tokenCount: e.t,
				createdAt: daysAgo(e.d),
			})),
		])
		.onConflictDoNothing()

	await db
		.insert(usageRecords)
		.values(
			histEvents.map((e, i) => ({
				id: hid("5", i + 1),
				clientId: e.clientId,
				messageId: hid("4", i + 1),
				tokensUsed: e.t,
				costUsd: e.cost,
				recordedAt: daysAgo(e.d),
			})),
		)
		.onConflictDoNothing()
	logger.info(
		`  ✓ historical analytics data (${histEvents.length} events across ${histPoints.length} days)`,
	)

	logger.info("Done.")
	await pgClient.end()
}

seed().catch((err) => {
	logger.error("Seed failed", { err })
	process.exit(1)
})
