import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
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
	console.error(
		"Missing required env vars: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB",
	)
	process.exit(1)
}

const sql = postgres(
	`postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`,
	{ max: 1 },
)
const db = drizzle(sql, { schema })

// Fixed UUIDs make the seed fully idempotent — re-running never creates duplicates
const ID = {
	// Admin
	admin: "00000000-0000-0000-0000-000000000001",
	// Clients
	client1: "00000000-0000-0000-0000-000000000010",
	client2: "00000000-0000-0000-0000-000000000011",
	// Bot configs
	botConfig1: "00000000-0000-0000-0000-000000000020",
	botConfig2: "00000000-0000-0000-0000-000000000021",
	// MCP servers
	preMadeMcp1: "00000000-0000-0000-0000-000000000030",
	preMadeMcp2: "00000000-0000-0000-0000-000000000031",
	customMcp1: "00000000-0000-0000-0000-000000000032",
	// Blacklist words
	blacklist1: "00000000-0000-0000-0000-000000000040",
	blacklist2: "00000000-0000-0000-0000-000000000041",
	blacklist3: "00000000-0000-0000-0000-000000000042",
	blacklist4: "00000000-0000-0000-0000-000000000043",
	// Admin access logs
	accessLog1: "00000000-0000-0000-0000-000000000050",
	accessLog2: "00000000-0000-0000-0000-000000000051",
	accessLog3: "00000000-0000-0000-0000-000000000052",
	// End user sessions
	session1: "00000000-0000-0000-0000-000000000060",
	session2: "00000000-0000-0000-0000-000000000061",
	session3: "00000000-0000-0000-0000-000000000062",
	// Conversations
	conv1: "00000000-0000-0000-0000-000000000070",
	conv2: "00000000-0000-0000-0000-000000000071",
	conv3: "00000000-0000-0000-0000-000000000072",
	// Messages
	msg1: "00000000-0000-0000-0000-000000000080",
	msg2: "00000000-0000-0000-0000-000000000081",
	msg3: "00000000-0000-0000-0000-000000000082",
	msg4: "00000000-0000-0000-0000-000000000083",
	msg5: "00000000-0000-0000-0000-000000000084",
	msg6: "00000000-0000-0000-0000-000000000085",
	msg7: "00000000-0000-0000-0000-000000000086",
	msg8: "00000000-0000-0000-0000-000000000087",
	// Usage records (one per assistant message)
	usage1: "00000000-0000-0000-0000-000000000090",
	usage2: "00000000-0000-0000-0000-000000000091",
	usage3: "00000000-0000-0000-0000-000000000092",
	usage4: "00000000-0000-0000-0000-000000000093",
	// Widget tokens
	widgetToken1: "00000000-0000-0000-0001-000000000010",
	widgetToken2: "00000000-0000-0000-0001-000000000011",
} as const

async function seed() {
	console.log("Seeding database...")

	// Wipe all data so the seed is always a clean re-insert regardless of prior state.
	// CASCADE handles FK ordering automatically.
	await sql`TRUNCATE admin_users, clients, pre_made_mcp_servers CASCADE`

	// ── Admin users ────────────────────────────────────────────────────────────
	await db
		.insert(adminUsers)
		.values({
			id: ID.admin,
			email: "admin@pagepal.dev",
			passwordHash: await Bun.password.hash("admin123"),
		})
		.onConflictDoUpdate({
			target: adminUsers.id,
			set: { passwordHash: await Bun.password.hash("admin123") },
		})
	console.log("  ✓ admin users")

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
			},
			{
				id: ID.client2,
				name: "TechStartup",
				email: "tech@pagepal.dev",
				passwordHash: await Bun.password.hash("client123"),
				balanceUsd: "250.0000",
				widgetToken: ID.widgetToken2,
				status: "active",
			},
		])
		.onConflictDoNothing()
	console.log("  ✓ clients")

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
				internetSearchEnabled: false,
			},
			{
				id: ID.botConfig2,
				clientId: ID.client2,
				systemPrompt:
					"You are a technical support specialist for TechStartup. Help users troubleshoot issues, explain features, and escalate complex problems when needed.",
				defaultRole: "Support Agent",
				toneStyle: "professional",
				internetSearchEnabled: true,
			},
		])
		.onConflictDoNothing()
	console.log("  ✓ bot configs")

	// ── Pre-made MCP servers ───────────────────────────────────────────────────
	await db
		.insert(preMadeMcpServers)
		.values([
			{
				id: ID.preMadeMcp1,
				mcpConfig: {
					type: "stdio",
					command: "npx",
					args: ["-y", "@mcp/weather"],
				},
			},
			{
				id: ID.preMadeMcp2,
				mcpConfig: {
					type: "stdio",
					command: "npx",
					args: ["-y", "@mcp/brave-search"],
					env: { BRAVE_API_KEY: "" },
				},
			},
		])
		.onConflictDoNothing()
	console.log("  ✓ pre-made MCP servers")

	// ── Client ↔ pre-made MCP associations ────────────────────────────────────
	await db
		.insert(clientPreMadeMcp)
		.values([
			{ clientId: ID.client1, preMadeMcpId: ID.preMadeMcp1 },
			{ clientId: ID.client2, preMadeMcpId: ID.preMadeMcp1 },
			{ clientId: ID.client2, preMadeMcpId: ID.preMadeMcp2 },
		])
		.onConflictDoNothing()
	console.log("  ✓ client MCP associations")

	// ── Custom MCP servers ─────────────────────────────────────────────────────
	await db
		.insert(customMcpServers)
		.values([
			{
				id: ID.customMcp1,
				clientId: ID.client1,
				mcpConfig: {
					type: "sse",
					url: "https://mcp.acme-corp.example.com/inventory/sse",
				},
			},
		])
		.onConflictDoNothing()
	console.log("  ✓ custom MCP servers")

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
	console.log("  ✓ blacklist words")

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
	console.log("  ✓ admin access logs")

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
	console.log("  ✓ end user sessions")

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
	console.log("  ✓ conversations")

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
				tokenCount: 45,
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
				tokenCount: 38,
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
				tokenCount: 35,
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
				tokenCount: 52,
			},
		])
		.onConflictDoNothing()
	console.log("  ✓ messages")

	// ── Usage records (one per assistant message) ──────────────────────────────
	// Cost approximation: $0.000003 per token (roughly Haiku-tier pricing)
	await db
		.insert(usageRecords)
		.values([
			{
				id: ID.usage1,
				clientId: ID.client1,
				messageId: ID.msg2,
				tokensUsed: 45,
				costUsd: "0.000135",
			},
			{
				id: ID.usage2,
				clientId: ID.client1,
				messageId: ID.msg4,
				tokensUsed: 38,
				costUsd: "0.000114",
			},
			{
				id: ID.usage3,
				clientId: ID.client1,
				messageId: ID.msg6,
				tokensUsed: 35,
				costUsd: "0.000105",
			},
			{
				id: ID.usage4,
				clientId: ID.client2,
				messageId: ID.msg8,
				tokensUsed: 52,
				costUsd: "0.000156",
			},
		])
		.onConflictDoNothing()
	console.log("  ✓ usage records")

	console.log("Done.")
	await sql.end()
}

seed().catch((err) => {
	console.error("Seed failed:", err)
	process.exit(1)
})
