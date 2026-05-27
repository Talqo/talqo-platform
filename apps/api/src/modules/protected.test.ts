import { describe, expect, it } from "bun:test"
import app from "@/app"

const PROTECTED_CLIENT_ENDPOINTS = [
	"/v1/client/me",
	"/v1/client/me/bot-config",
	"/v1/client/me/blacklist",
	"/v1/client/me/analytics",
	"/v1/client/me/mcp/pre-made",
]

const PROTECTED_ADMIN_ENDPOINTS = [
	"/v1/admin/clients",
	"/v1/admin/analytics",
	"/v1/admin/conversations",
]

describe("Protected client endpoints return 401 without auth", () => {
	for (const path of PROTECTED_CLIENT_ENDPOINTS) {
		it(`GET ${path}`, async () => {
			const res = await app.request(path)
			expect(res.status).toBe(401)
		})
	}
})

describe("Protected admin endpoints return 401 without auth", () => {
	for (const path of PROTECTED_ADMIN_ENDPOINTS) {
		it(`GET ${path}`, async () => {
			const res = await app.request(path)
			expect(res.status).toBe(401)
		})
	}
})
