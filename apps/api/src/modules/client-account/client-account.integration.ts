import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test"
import type { OpenAPIHono } from "@hono/zod-openapi"
import type { AppVariables } from "@/common/jwt"
import {
	cleanupEmails,
	createUniqueEmail,
	registerAndVerify,
} from "@/common/test-utils"

const mockSend = mock(async () => ({ data: { id: "test-id" }, error: null }))

mock.module("resend", () => ({
	Resend: class {
		emails = { send: mockSend }
	},
}))

describe("Client Account integration tests", () => {
	let realApp: OpenAPIHono<{ Variables: AppVariables }>
	const createdEmails = new Set<string>()

	beforeAll(async () => {
		const mod = await import("@/app")
		realApp = mod.default
	})

	afterAll(async () => {
		await cleanupEmails(Array.from(createdEmails))
	})

	async function registerAndTrack(
		email: string,
		name: string,
		password?: string,
	) {
		const token = await registerAndVerify(realApp, email, name, password)
		createdEmails.add(email.toLowerCase())
		return token
	}

	it("GET /client/me returns authenticated client profile", async () => {
		const email = createUniqueEmail("account-test")
		const name = `Account Test ${crypto.randomUUID()}`
		const token = await registerAndTrack(email, name)

		const res = await realApp.request("/v1/client/me", {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as { name: string; email: string }
		expect(body.name).toBe(name.toLowerCase())
		expect(body.email).toBe(email.toLowerCase())
	})

	it("PATCH /client/me updates client profile", async () => {
		const email = createUniqueEmail("account-test")
		const token = await registerAndTrack(
			email,
			`Old Name ${crypto.randomUUID()}`,
		)

		const res = await realApp.request("/v1/client/me", {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ name: "New Name" }),
		})
		expect(res.status).toBe(200)

		const getRes = await realApp.request("/v1/client/me", {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(getRes.status).toBe(200)
		const body = (await getRes.json()) as { name: string }
		expect(body.name).toBe("New Name")
	})

	it("GET /client/me without token returns 401", async () => {
		const res = await realApp.request("/v1/client/me")
		expect(res.status).toBe(401)
	})

	it("DELETE /client/me deletes account and invalidates token", async () => {
		const email = createUniqueEmail("account-test")
		const password = "password123"
		const token = await registerAndTrack(
			email,
			`Delete Me ${crypto.randomUUID()}`,
			password,
		)

		const deleteRes = await realApp.request("/v1/client/me", {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ password }),
		})
		expect(deleteRes.status).toBe(200)

		const getRes = await realApp.request("/v1/client/me", {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(getRes.status).toBe(401)
	})
})
