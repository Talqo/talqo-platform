import { describe, expect, it } from "bun:test"
import { signToken, verifyToken } from "./jwt"

describe("signToken / verifyToken", () => {
	it("round-trips sub, role, and tokenVersion", async () => {
		const token = await signToken({
			sub: "client-1",
			role: "client",
			tokenVersion: 3,
		})
		const payload = await verifyToken(token)
		expect(payload.sub).toBe("client-1")
		expect(payload.role).toBe("client")
		expect(payload.tokenVersion).toBe(3)
	})

	it("omits tokenVersion from the payload when not provided", async () => {
		const token = await signToken({ sub: "admin-1", role: "admin" })
		const payload = await verifyToken(token)
		expect(payload.tokenVersion).toBeUndefined()
	})

	it("preserves tokenVersion across impersonation tokens (imp: true)", async () => {
		const token = await signToken({
			sub: "client-2",
			role: "client",
			imp: true,
			tokenVersion: 5,
		})
		const payload = await verifyToken(token)
		expect(payload.imp).toBe(true)
		expect(payload.tokenVersion).toBe(5)
	})
})
