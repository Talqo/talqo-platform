import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test"
import type { OpenAPIHono } from "@hono/zod-openapi"
import type { AppVariables } from "@/common/jwt"
import {
	cleanupAdminData,
	cleanupEmails,
	createAdminUser,
	createUniqueEmail,
	registerAndVerify,
	withSql,
} from "@/common/test-utils"

const mockSend = mock(async () => ({ data: { id: "test-id" }, error: null }))

mock.module("resend", () => ({
	Resend: class {
		emails = { send: mockSend }
	},
}))

mock.module("ai", () => ({
	streamText: mock(() => ({
		fullStream: (async function* () {
			yield { type: "text-delta", text: "Hello" }
		})(),
		usage: Promise.resolve({ inputTokens: 1, outputTokens: 2 }),
	})),
	stepCountIs: mock(() => () => false),
	generateText: mock(() =>
		Promise.resolve({ text: "Hello", finishReason: "stop" }),
	),
	embed: mock(() =>
		Promise.resolve({ embedding: [0.1, 0.2, 0.3], usage: { tokens: 1 } }),
	),
	embedMany: mock(() =>
		Promise.resolve({
			embeddings: [[0.1, 0.2, 0.3]],
			usage: { tokens: 1 },
		}),
	),
	tool: mock((config: unknown) => config),
}))

mock.module("@/modules/agent/agent.mcp", () => ({
	verifyMcpServer: mock(async () => ({
		ok: true,
		tools: ["tool-a", "tool-b"],
	})),
	// connectMcpServers must be included: agent.service.ts imports it from this
	// module at app boot time even though no MCP route under test exercises it.
	connectMcpServers: mock(async () => ({ tools: {}, close: async () => {} })),
}))

const TEST_MCP_CONFIG = {
	type: "http",
	url: "https://mcp.example.com/sse",
}

describe("MCP integration tests", () => {
	let realApp: OpenAPIHono<{ Variables: AppVariables }>
	const createdClientEmails = new Set<string>()
	const createdAdminEmails = new Set<string>()
	const createdPreMadeServerIds = new Set<string>()

	beforeAll(async () => {
		process.env.NODE_ENV ??= "test"
		const mod = await import("@/app")
		realApp = mod.default
	})

	afterAll(async () => {
		if (createdPreMadeServerIds.size > 0) {
			await withSql(async (sql) => {
				const ids = Array.from(createdPreMadeServerIds)
				await sql`DELETE FROM pre_made_mcp_servers WHERE id = ANY(${ids})`
			})
		}
		await cleanupEmails(Array.from(createdClientEmails))
		await cleanupAdminData(Array.from(createdAdminEmails))
	})

	async function registerClient(email: string, name: string) {
		const token = await registerAndVerify(realApp, email, name)
		createdClientEmails.add(email.toLowerCase())
		return token
	}

	async function createAdmin(email: string) {
		const { token } = await createAdminUser(realApp, email)
		createdAdminEmails.add(email.toLowerCase())
		return token
	}

	// ─── Admin: pre-made server management ───────────────────────────────────

	it("POST /admin/mcp/pre-made creates a pre-made server", async () => {
		const adminToken = await createAdmin(createUniqueEmail("mcp-admin-test"))

		const res = await realApp.request("/v1/admin/mcp/pre-made", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${adminToken}`,
			},
			body: JSON.stringify({
				name: `Test MCP ${crypto.randomUUID()}`,
				description: "Integration test server",
				mcpConfig: TEST_MCP_CONFIG,
			}),
		})
		expect(res.status).toBe(201)
		const body = (await res.json()) as { id: string; name: string }
		expect(body.id).toBeDefined()
		createdPreMadeServerIds.add(body.id)
	})

	it("GET /admin/mcp/pre-made lists pre-made servers", async () => {
		const adminToken = await createAdmin(createUniqueEmail("mcp-admin-test"))

		const createRes = await realApp.request("/v1/admin/mcp/pre-made", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${adminToken}`,
			},
			body: JSON.stringify({
				name: `Test MCP List ${crypto.randomUUID()}`,
				mcpConfig: TEST_MCP_CONFIG,
			}),
		})
		const created = (await createRes.json()) as { id: string }
		createdPreMadeServerIds.add(created.id)

		const res = await realApp.request("/v1/admin/mcp/pre-made", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as Array<{ id: string }>
		expect(Array.isArray(body)).toBe(true)
		expect(body.some((s) => s.id === created.id)).toBe(true)
	})

	it("PATCH /admin/mcp/pre-made/:serverId updates a pre-made server", async () => {
		const adminToken = await createAdmin(createUniqueEmail("mcp-admin-test"))

		const createRes = await realApp.request("/v1/admin/mcp/pre-made", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${adminToken}`,
			},
			body: JSON.stringify({
				name: `Test MCP Patch ${crypto.randomUUID()}`,
				mcpConfig: TEST_MCP_CONFIG,
			}),
		})
		const created = (await createRes.json()) as { id: string }
		createdPreMadeServerIds.add(created.id)

		const res = await realApp.request(`/v1/admin/mcp/pre-made/${created.id}`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${adminToken}`,
			},
			body: JSON.stringify({
				name: "Updated MCP Name",
				description: "Updated description",
				mcpConfig: TEST_MCP_CONFIG,
			}),
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as { name: string }
		expect(body.name).toBe("Updated MCP Name")
	})

	it("DELETE /admin/mcp/pre-made/:serverId removes a pre-made server", async () => {
		const adminToken = await createAdmin(createUniqueEmail("mcp-admin-test"))

		const createRes = await realApp.request("/v1/admin/mcp/pre-made", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${adminToken}`,
			},
			body: JSON.stringify({
				name: `Test MCP Delete ${crypto.randomUUID()}`,
				mcpConfig: TEST_MCP_CONFIG,
			}),
		})
		const created = (await createRes.json()) as { id: string }

		const res = await realApp.request(`/v1/admin/mcp/pre-made/${created.id}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)

		const listRes = await realApp.request("/v1/admin/mcp/pre-made", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		const list = (await listRes.json()) as Array<{ id: string }>
		expect(list.some((s) => s.id === created.id)).toBe(false)
	})

	// ─── Client: pre-made server operations ──────────────────────────────────

	it("GET /client/me/mcp/pre-made lists available pre-made servers", async () => {
		const email = createUniqueEmail("mcp-client-test")
		const clientToken = await registerClient(
			email,
			`MCP Client Test ${crypto.randomUUID()}`,
		)

		const res = await realApp.request("/v1/client/me/mcp/pre-made", {
			headers: { Authorization: `Bearer ${clientToken}` },
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as unknown[]
		expect(Array.isArray(body)).toBe(true)
	})

	it("POST /client/me/mcp/pre-made/:serverId enables a pre-made server", async () => {
		const adminToken = await createAdmin(createUniqueEmail("mcp-admin-test"))
		const createRes = await realApp.request("/v1/admin/mcp/pre-made", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${adminToken}`,
			},
			body: JSON.stringify({
				name: `Test MCP Enable ${crypto.randomUUID()}`,
				mcpConfig: TEST_MCP_CONFIG,
			}),
		})
		const server = (await createRes.json()) as { id: string }
		createdPreMadeServerIds.add(server.id)

		const email = createUniqueEmail("mcp-client-test")
		const clientToken = await registerClient(
			email,
			`MCP Client Test ${crypto.randomUUID()}`,
		)

		const res = await realApp.request(
			`/v1/client/me/mcp/pre-made/${server.id}`,
			{
				method: "POST",
				headers: { Authorization: `Bearer ${clientToken}` },
			},
		)
		expect(res.status).toBe(200)

		const enabledRes = await realApp.request(
			"/v1/client/me/mcp/pre-made/enabled",
			{ headers: { Authorization: `Bearer ${clientToken}` } },
		)
		expect(enabledRes.status).toBe(200)
		const enabledBody = (await enabledRes.json()) as Array<{ id: string }>
		expect(enabledBody.some((s) => s.id === server.id)).toBe(true)
	})

	it("GET /client/me/mcp/pre-made/enabled lists only enabled servers", async () => {
		const adminToken = await createAdmin(createUniqueEmail("mcp-admin-test"))
		const createRes = await realApp.request("/v1/admin/mcp/pre-made", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${adminToken}`,
			},
			body: JSON.stringify({
				name: `Test MCP Enabled List ${crypto.randomUUID()}`,
				mcpConfig: TEST_MCP_CONFIG,
			}),
		})
		const server = (await createRes.json()) as { id: string }
		createdPreMadeServerIds.add(server.id)

		const email = createUniqueEmail("mcp-client-test")
		const clientToken = await registerClient(
			email,
			`MCP Client Test ${crypto.randomUUID()}`,
		)

		await realApp.request(`/v1/client/me/mcp/pre-made/${server.id}`, {
			method: "POST",
			headers: { Authorization: `Bearer ${clientToken}` },
		})

		const res = await realApp.request("/v1/client/me/mcp/pre-made/enabled", {
			headers: { Authorization: `Bearer ${clientToken}` },
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as Array<{ id: string }>
		expect(body.some((s) => s.id === server.id)).toBe(true)
	})

	it("DELETE /client/me/mcp/pre-made/:serverId disables a pre-made server", async () => {
		const adminToken = await createAdmin(createUniqueEmail("mcp-admin-test"))
		const createRes = await realApp.request("/v1/admin/mcp/pre-made", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${adminToken}`,
			},
			body: JSON.stringify({
				name: `Test MCP Disable ${crypto.randomUUID()}`,
				mcpConfig: TEST_MCP_CONFIG,
			}),
		})
		const server = (await createRes.json()) as { id: string }
		createdPreMadeServerIds.add(server.id)

		const email = createUniqueEmail("mcp-client-test")
		const clientToken = await registerClient(
			email,
			`MCP Client Test ${crypto.randomUUID()}`,
		)

		await realApp.request(`/v1/client/me/mcp/pre-made/${server.id}`, {
			method: "POST",
			headers: { Authorization: `Bearer ${clientToken}` },
		})

		const res = await realApp.request(
			`/v1/client/me/mcp/pre-made/${server.id}`,
			{
				method: "DELETE",
				headers: { Authorization: `Bearer ${clientToken}` },
			},
		)
		expect(res.status).toBe(200)

		const enabledRes = await realApp.request(
			"/v1/client/me/mcp/pre-made/enabled",
			{ headers: { Authorization: `Bearer ${clientToken}` } },
		)
		expect(enabledRes.status).toBe(200)
		const enabledBody = (await enabledRes.json()) as Array<{ id: string }>
		expect(enabledBody.some((s) => s.id === server.id)).toBe(false)
	})

	// ─── Client: custom server CRUD ───────────────────────────────────────────

	it("POST /client/me/mcp/custom creates a custom server", async () => {
		const email = createUniqueEmail("mcp-client-test")
		const clientToken = await registerClient(
			email,
			`MCP Client Test ${crypto.randomUUID()}`,
		)

		const res = await realApp.request("/v1/client/me/mcp/custom", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${clientToken}`,
			},
			body: JSON.stringify({ mcpConfig: TEST_MCP_CONFIG }),
		})
		expect(res.status).toBe(201)
		const body = (await res.json()) as { id: string }
		expect(body.id).toBeDefined()
	})

	it("GET /client/me/mcp/custom lists custom servers", async () => {
		const email = createUniqueEmail("mcp-client-test")
		const clientToken = await registerClient(
			email,
			`MCP Client Test ${crypto.randomUUID()}`,
		)

		await realApp.request("/v1/client/me/mcp/custom", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${clientToken}`,
			},
			body: JSON.stringify({ mcpConfig: TEST_MCP_CONFIG }),
		})

		const res = await realApp.request("/v1/client/me/mcp/custom", {
			headers: { Authorization: `Bearer ${clientToken}` },
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as unknown[]
		expect(Array.isArray(body)).toBe(true)
		expect(body.length).toBe(1)
	})

	it("PATCH /client/me/mcp/custom/:serverId updates a custom server", async () => {
		const email = createUniqueEmail("mcp-client-test")
		const clientToken = await registerClient(
			email,
			`MCP Client Test ${crypto.randomUUID()}`,
		)

		const createRes = await realApp.request("/v1/client/me/mcp/custom", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${clientToken}`,
			},
			body: JSON.stringify({ mcpConfig: TEST_MCP_CONFIG }),
		})
		const created = (await createRes.json()) as { id: string }

		const updatedConfig = {
			type: "http",
			url: "https://updated.example.com/sse",
		}

		const res = await realApp.request(
			`/v1/client/me/mcp/custom/${created.id}`,
			{
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${clientToken}`,
				},
				body: JSON.stringify({ mcpConfig: updatedConfig }),
			},
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as { mcpConfig: { url: string } }
		expect((body.mcpConfig as { url: string }).url).toBe(updatedConfig.url)
	})

	it("DELETE /client/me/mcp/custom/:serverId removes a custom server", async () => {
		const email = createUniqueEmail("mcp-client-test")
		const clientToken = await registerClient(
			email,
			`MCP Client Test ${crypto.randomUUID()}`,
		)

		const createRes = await realApp.request("/v1/client/me/mcp/custom", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${clientToken}`,
			},
			body: JSON.stringify({ mcpConfig: TEST_MCP_CONFIG }),
		})
		const created = (await createRes.json()) as { id: string }

		const res = await realApp.request(
			`/v1/client/me/mcp/custom/${created.id}`,
			{
				method: "DELETE",
				headers: { Authorization: `Bearer ${clientToken}` },
			},
		)
		expect(res.status).toBe(200)

		const listRes = await realApp.request("/v1/client/me/mcp/custom", {
			headers: { Authorization: `Bearer ${clientToken}` },
		})
		expect(listRes.status).toBe(200)
		const listBody = (await listRes.json()) as unknown[]
		expect(listBody.length).toBe(0)
	})

	// ─── Client: verify ───────────────────────────────────────────────────────

	it("POST /client/me/mcp/verify returns ok for a known server", async () => {
		const email = createUniqueEmail("mcp-client-test")
		const clientToken = await registerClient(
			email,
			`MCP Client Test ${crypto.randomUUID()}`,
		)

		const createRes = await realApp.request("/v1/client/me/mcp/custom", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${clientToken}`,
			},
			body: JSON.stringify({ mcpConfig: TEST_MCP_CONFIG }),
		})
		const server = (await createRes.json()) as { id: string }

		const res = await realApp.request("/v1/client/me/mcp/verify", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${clientToken}`,
			},
			body: JSON.stringify({ serverId: server.id }),
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as { ok: boolean }
		expect(body.ok).toBe(true)
	})

	it("POST /client/me/mcp/verify with unknown server id returns 404", async () => {
		const email = createUniqueEmail("mcp-client-test")
		const clientToken = await registerClient(
			email,
			`MCP Client Test ${crypto.randomUUID()}`,
		)

		const res = await realApp.request("/v1/client/me/mcp/verify", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${clientToken}`,
			},
			body: JSON.stringify({ serverId: crypto.randomUUID() }),
		})
		expect(res.status).toBe(404)
	})

	it("GET /client/me/mcp/pre-made without token returns 401", async () => {
		const res = await realApp.request("/v1/client/me/mcp/pre-made")
		expect(res.status).toBe(401)
	})

	it("GET /admin/mcp/pre-made without token returns 401", async () => {
		const res = await realApp.request("/v1/admin/mcp/pre-made")
		expect(res.status).toBe(401)
	})

	it("GET /admin/mcp/pre-made with client token returns 403", async () => {
		const email = createUniqueEmail("mcp-client-test")
		const clientToken = await registerClient(
			email,
			`MCP Client Test ${crypto.randomUUID()}`,
		)
		const res = await realApp.request("/v1/admin/mcp/pre-made", {
			headers: { Authorization: `Bearer ${clientToken}` },
		})
		expect(res.status).toBe(403)
	})

	it("GET /client/me/mcp/pre-made caps results at the requested limit", async () => {
		const adminToken = await createAdmin(createUniqueEmail("mcp-admin-test"))

		for (let i = 0; i < 3; i++) {
			const res = await realApp.request("/v1/admin/mcp/pre-made", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${adminToken}`,
				},
				body: JSON.stringify({
					name: `Pagination Test Server ${crypto.randomUUID()}`,
					mcpConfig: { type: "http", url: "https://mcp.example.com/mcp" },
				}),
			})
			expect(res.status).toBe(201)
			const body = (await res.json()) as { id: string }
			createdPreMadeServerIds.add(body.id)
		}

		const email = createUniqueEmail("client-mcp-page-test")
		const clientToken = await registerClient(
			email,
			"MCP Pagination Test Client",
		)

		const res = await realApp.request(
			"/v1/client/me/mcp/pre-made?limit=1&offset=0",
			{ headers: { Authorization: `Bearer ${clientToken}` } },
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as unknown[]
		expect(body.length).toBe(1)
	})
})
