import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test"
import type { OpenAPIHono } from "@hono/zod-openapi"
import type { AppVariables } from "@/common/jwt"
import {
	cleanupAdminData,
	createAdminUser,
	createUniqueEmail,
	registerClient,
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
})
