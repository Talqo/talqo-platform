import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import {
	adminUsers,
	blacklistWords,
	botConfigs,
	clientPreMadeMcp,
	clients,
	preMadeMcpServers,
} from "./schema";

// Connect directly — JWT_SECRET is not needed for seeding
const {
	POSTGRES_USER,
	POSTGRES_PASSWORD,
	POSTGRES_HOST = "localhost",
	POSTGRES_PORT = "5432",
	POSTGRES_DB,
} = process.env;

if (!POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_DB) {
	console.error(
		"Missing required env vars: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB",
	);
	process.exit(1);
}

const sql = postgres(
	`postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`,
	{ max: 1 },
);
const db = drizzle(sql, { schema });

// Fixed UUIDs make the seed fully idempotent — re-running never creates duplicates
const ID = {
	admin: "00000000-0000-0000-0000-000000000001",
	client1: "00000000-0000-0000-0000-000000000010",
	client2: "00000000-0000-0000-0000-000000000011",
	botConfig1: "00000000-0000-0000-0000-000000000020",
	botConfig2: "00000000-0000-0000-0000-000000000021",
	preMadeMcp1: "00000000-0000-0000-0000-000000000030",
	preMadeMcp2: "00000000-0000-0000-0000-000000000031",
	blacklist1: "00000000-0000-0000-0000-000000000040",
	blacklist2: "00000000-0000-0000-0000-000000000041",
	blacklist3: "00000000-0000-0000-0000-000000000042",
	widgetToken1: "00000000-0000-0000-0001-000000000010",
	widgetToken2: "00000000-0000-0000-0001-000000000011",
} as const;

async function seed() {
	console.log("Seeding database...");

	// ── Admin users ────────────────────────────────────────────────────────────
	await db
		.insert(adminUsers)
		.values({
			id: ID.admin,
			email: "admin@pagepal.dev",
			passwordHash: await Bun.password.hash("admin123"),
		})
		.onConflictDoNothing();
	console.log("  ✓ admin users");

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
		.onConflictDoNothing();
	console.log("  ✓ clients");

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
		.onConflictDoNothing();
	console.log("  ✓ bot configs");

	// ── Pre-made MCP servers ───────────────────────────────────────────────────
	await db
		.insert(preMadeMcpServers)
		.values([
			{
				id: ID.preMadeMcp1,
				mcpConfig: {
					name: "Weather",
					description: "Provides real-time weather information",
					command: "npx",
					args: ["-y", "@mcp/weather"],
				},
			},
			{
				id: ID.preMadeMcp2,
				mcpConfig: {
					name: "Web Search",
					description: "Enables web search via Brave Search API",
					command: "npx",
					args: ["-y", "@mcp/brave-search"],
					env: { BRAVE_API_KEY: "" },
				},
			},
		])
		.onConflictDoNothing();
	console.log("  ✓ pre-made MCP servers");

	// ── Client ↔ pre-made MCP associations ────────────────────────────────────
	await db
		.insert(clientPreMadeMcp)
		.values({ clientId: ID.client1, preMadeMcpId: ID.preMadeMcp1 })
		.onConflictDoNothing();
	console.log("  ✓ client MCP associations");

	// ── Blacklist words ────────────────────────────────────────────────────────
	await db
		.insert(blacklistWords)
		.values([
			{ id: ID.blacklist1, clientId: ID.client1, word: "competitor" },
			{ id: ID.blacklist2, clientId: ID.client1, word: "refund" },
			{ id: ID.blacklist3, clientId: ID.client2, word: "lawsuit" },
		])
		.onConflictDoNothing();
	console.log("  ✓ blacklist words");

	console.log("Done.");
	await sql.end();
}

seed().catch((err) => {
	console.error("Seed failed:", err);
	process.exit(1);
});
