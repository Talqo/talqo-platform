import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test"
import type { OpenAPIHono } from "@hono/zod-openapi"
import type { AppVariables } from "@/common/jwt"
import {
	cleanupAdminData,
	createAdminUser,
	createUniqueEmail,
	registerClient,
	withSql,
} from "@/common/test-utils"

const mockSend = mock(async () => ({ data: { id: "test-id" }, error: null }))

mock.module("resend", () => ({
	Resend: class {
		emails = { send: mockSend }
	},
}))

describe("Admin integration tests", () => {
	let realApp: OpenAPIHono<{ Variables: AppVariables }>
	const createdEmails = new Set<string>()

	beforeAll(async () => {
		process.env.NODE_ENV ??= "test"
		const mod = await import("@/app")
		realApp = mod.default
	})

	afterAll(async () => {
		await cleanupAdminData(Array.from(createdEmails))
	})

	async function registerAdminClient(email: string, name: string) {
		const client = await registerClient(realApp, email, name)
		createdEmails.add(email.toLowerCase())
		return { id: client.id }
	}

	async function createAdminToken(): Promise<string> {
		const email = createUniqueEmail("admin-test")
		const { token } = await createAdminUser(realApp, email)
		createdEmails.add(email.toLowerCase())
		return token
	}

	it("GET /admin/clients returns list of clients for admin", async () => {
		const adminToken = await createAdminToken()
		const clientEmail = createUniqueEmail("client-test")
		const { id: clientId } = await registerAdminClient(
			clientEmail,
			"Admin Client List Test",
		)

		const res = await realApp.request("/v1/admin/clients?limit=20&offset=0", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as Array<{ id: string; email: string }>
		expect(Array.isArray(body)).toBe(true)
		expect(body.some((c) => c.id === clientId)).toBe(true)
	})

	it("PATCH /admin/clients/:clientId/status suspends a client", async () => {
		const adminToken = await createAdminToken()
		const clientEmail = createUniqueEmail("client-test")
		const client = await registerAdminClient(clientEmail, "Admin Suspend Test")

		const res = await realApp.request(`/v1/admin/clients/${client.id}/status`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${adminToken}`,
			},
			body: JSON.stringify({ status: "suspended" }),
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as { id: string; status: string }
		expect(body.status).toBe("suspended")
	})

	it("GET /admin/me returns admin profile", async () => {
		const adminToken = await createAdminToken()

		const res = await realApp.request("/v1/admin/me", {
			headers: { Authorization: `Bearer ${adminToken}` },
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			id: string
			email: string
			role: string
		}
		expect(body.id).toBeDefined()
		expect(body.email).toBeDefined()
		expect(body.role).toBe("admin")
	})

	it("GET /admin/clients without token returns 401", async () => {
		const res = await realApp.request("/v1/admin/clients?limit=20&offset=0")
		expect(res.status).toBe(401)
	})

	it("softDeleteAdmin deactivates an admin so activeAdminUsers-backed lookups reject them", async () => {
		const { AdminRepository } = await import("./admin.repository")
		const { db } = await import("@/db")
		const repo = new AdminRepository(db)

		const email = createUniqueEmail("admin-softdelete-test")
		const { token } = await createAdminUser(realApp, email)
		createdEmails.add(email.toLowerCase())

		// Sanity check: token works before deactivation
		const beforeRes = await realApp.request("/v1/admin/me", {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(beforeRes.status).toBe(200)

		const [row] = await withSql(
			(sql) => sql`SELECT id FROM admin_users WHERE email = ${email}`,
		)
		const adminId = (row as { id: string }).id

		const deleted = await repo.softDeleteAdmin(adminId)
		expect(deleted).toBe(true)

		// Repeated soft-delete is a no-op, not an error
		const deletedAgain = await repo.softDeleteAdmin(adminId)
		expect(deletedAgain).toBe(false)

		expect(await repo.findAdminById(adminId)).toBeNull()
		expect(await repo.findAdminByEmail(email)).toBeNull()

		// The existing token must now be rejected by adminAuth
		const afterRes = await realApp.request("/v1/admin/me", {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(afterRes.status).toBe(401)
	})

	it("GET /admin/activity-logs surfaces actions with no explicit audit label", async () => {
		const adminToken = await createAdminToken()

		// Falls back to "METHOD /path" — previously filtered out entirely
		const createRes = await realApp.request("/v1/admin/mcp/pre-made", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${adminToken}`,
			},
			body: JSON.stringify({
				name: `Activity Log Test Server ${crypto.randomUUID()}`,
				mcpConfig: { type: "http", url: "https://mcp.example.com/mcp" },
			}),
		})
		expect(createRes.status).toBe(201)

		const logsRes = await realApp.request(
			"/v1/admin/activity-logs?limit=50&offset=0",
			{ headers: { Authorization: `Bearer ${adminToken}` } },
		)
		expect(logsRes.status).toBe(200)
		const logs = (await logsRes.json()) as Array<{ actionType: string }>
		expect(
			logs.some((l) => l.actionType === "POST /v1/admin/mcp/pre-made"),
		).toBe(true)
	})
})
