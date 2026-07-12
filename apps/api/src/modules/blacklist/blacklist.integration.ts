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

describe("Blacklist integration tests", () => {
	let realApp: OpenAPIHono<{ Variables: AppVariables }>
	const createdEmails = new Set<string>()

	beforeAll(async () => {
		process.env.NODE_ENV ??= "test"
		const mod = await import("@/app")
		realApp = mod.default
	})

	afterAll(async () => {
		await cleanupEmails(Array.from(createdEmails))
	})

	async function registerClient(email: string, name: string) {
		const token = await registerAndVerify(realApp, email, name)
		createdEmails.add(email.toLowerCase())
		return token
	}

	it("GET /client/me/blacklist returns empty list for new client", async () => {
		const email = createUniqueEmail("blacklist-test")
		const token = await registerClient(
			email,
			`Blacklist Test ${crypto.randomUUID()}`,
		)

		const res = await realApp.request("/v1/client/me/blacklist", {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as unknown[]
		expect(Array.isArray(body)).toBe(true)
		expect(body.length).toBe(0)
	})

	it("POST /client/me/blacklist adds a word and returns it", async () => {
		const email = createUniqueEmail("blacklist-test")
		const token = await registerClient(
			email,
			`Blacklist Test ${crypto.randomUUID()}`,
		)

		const res = await realApp.request("/v1/client/me/blacklist", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ word: "badword" }),
		})
		expect(res.status).toBe(201)
		const body = (await res.json()) as { id: string; word: string }
		expect(body.id).toBeDefined()
		expect(body.word).toBe("badword")
	})

	it("POST /client/me/blacklist with duplicate word returns 409", async () => {
		const email = createUniqueEmail("blacklist-test")
		const token = await registerClient(
			email,
			`Blacklist Test ${crypto.randomUUID()}`,
		)

		const res1 = await realApp.request("/v1/client/me/blacklist", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ word: "dupword" }),
		})
		expect(res1.status).toBe(201)

		const res2 = await realApp.request("/v1/client/me/blacklist", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ word: "dupword" }),
		})
		expect(res2.status).toBe(409)
	})

	it("GET /client/me/blacklist returns added words", async () => {
		const email = createUniqueEmail("blacklist-test")
		const token = await registerClient(
			email,
			`Blacklist Test ${crypto.randomUUID()}`,
		)

		await realApp.request("/v1/client/me/blacklist", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ word: "forbidden" }),
		})

		const res = await realApp.request("/v1/client/me/blacklist", {
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(res.status).toBe(200)
		const body = (await res.json()) as Array<{ word: string }>
		expect(body.some((w) => w.word === "forbidden")).toBe(true)
	})

	it("DELETE /client/me/blacklist/:wordId removes the word", async () => {
		const email = createUniqueEmail("blacklist-test")
		const token = await registerClient(
			email,
			`Blacklist Test ${crypto.randomUUID()}`,
		)

		const addRes = await realApp.request("/v1/client/me/blacklist", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ word: "toremove" }),
		})
		const { id } = (await addRes.json()) as { id: string }

		const deleteRes = await realApp.request(`/v1/client/me/blacklist/${id}`, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${token}` },
		})
		expect(deleteRes.status).toBe(200)

		const listRes = await realApp.request("/v1/client/me/blacklist", {
			headers: { Authorization: `Bearer ${token}` },
		})
		const body = (await listRes.json()) as Array<{ word: string }>
		expect(body.some((w) => w.word === "toremove")).toBe(false)
	})

	it("DELETE /client/me/blacklist/:wordId with unknown id returns 404", async () => {
		const email = createUniqueEmail("blacklist-test")
		const token = await registerClient(
			email,
			`Blacklist Test ${crypto.randomUUID()}`,
		)

		const res = await realApp.request(
			`/v1/client/me/blacklist/${crypto.randomUUID()}`,
			{
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			},
		)
		expect(res.status).toBe(404)
	})

	it("GET /client/me/blacklist without token returns 401", async () => {
		const res = await realApp.request("/v1/client/me/blacklist")
		expect(res.status).toBe(401)
	})
})
