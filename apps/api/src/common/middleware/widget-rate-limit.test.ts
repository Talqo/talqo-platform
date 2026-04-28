import { beforeEach, describe, expect, it, mock } from "bun:test"
import type { MiddlewareHandler } from "hono"

const mockDb = {
	select: mock(() => ({
		from: mock(() => ({
			where: mock(async () => []),
		})),
	})),
	insert: mock(() => ({
		values: mock(() => ({
			onConflictDoUpdate: mock(() => ({
				returning: mock(async () => [{ count: 1 }]),
			})),
		})),
	})),
	delete: mock(() => ({
		where: mock(async () => []),
	})),
} as unknown as import("../../db").DB

// IMPORTANT: mocks MUST be declared before mock.module calls due to Bun caching
mock.module("../../db", () => ({ db: mockDb }))
mock.module("../config", () => ({
	config: { WIDGET_RATE_LIMIT_PER_HOUR: 2 },
}))

const { widgetRateLimit } = await import("./widget-rate-limit")

function createMockContext(
	headerIp: string,
	remoteHostname: string = headerIp || "127.0.0.1",
) {
	return {
		req: {
			header: mock((name: string) =>
				name === "X-Forwarded-For" ? headerIp : undefined,
			),
		},
		// getConnInfo reads c.env.server.requestIP()
		env: {
			server: {
				requestIP: () => ({
					address: remoteHostname,
					family: "IPv4",
					port: 12345,
				}),
			},
		},
		json: mock((body: unknown, status: number) => ({ body, status })),
		get: mock(() => ({ warn: mock(() => {}) })),
	} as unknown as Parameters<MiddlewareHandler>[0]
}

describe("widgetRateLimit", () => {
	beforeEach(() => {
		// Reset the mock insert's nested chain
		mockDb.insert = mock(() => ({
			values: mock(() => ({
				onConflictDoUpdate: mock(() => ({
					returning: mock(async () => [{ count: 1 }]),
				})),
			})),
		})) as never
	})

	it("passes when under the rate limit", async () => {
		const next = mock(async () => {})
		const c = createMockContext("1.2.3.4")
		await widgetRateLimit(c, next)
		expect(next).toHaveBeenCalled()
	})

	it("rejects when over the rate limit", async () => {
		mockDb.insert = mock(() => ({
			values: mock(() => ({
				onConflictDoUpdate: mock(() => ({
					returning: mock(async () => [{ count: 3 }]),
				})),
			})),
		})) as never

		const next = mock(async () => {})
		const c = createMockContext("1.2.3.4")
		await expect(widgetRateLimit(c, next)).rejects.toThrow("Too many requests")
	})

	it("handles missing X-Forwarded-For by falling back to remoteAddr", async () => {
		const next = mock(async () => {})
		const c = createMockContext("", "1.2.3.4")
		await widgetRateLimit(c, next)
		expect(next).toHaveBeenCalled()
	})

	it("trusts private internal IPs as proxies and uses X-Forwarded-For", async () => {
		// k8s ingress scenario: direct IP is 10.x.x.x (internal), forwarded is real client
		const next = mock(async () => {})
		const c = createMockContext("203.0.113.45", "10.0.1.50")
		await widgetRateLimit(c, next)
		expect(next).toHaveBeenCalled()
	})

	it("rate-limits by real client IP, not ingress IP, in k8s", async () => {
		// First two requests from real client pass
		for (let i = 0; i < 2; i++) {
			const next = mock(async () => {})
			const c = createMockContext("203.0.113.45", "10.0.1.50")
			await widgetRateLimit(c, next)
			expect(next).toHaveBeenCalled()
		}

		// Third request from same real client via same ingress -> blocked
		mockDb.insert = mock(() => ({
			values: mock(() => ({
				onConflictDoUpdate: mock(() => ({
					returning: mock(async () => [{ count: 3 }]),
				})),
			})),
		})) as never
		const next = mock(async () => {})
		const c = createMockContext("203.0.113.45", "10.0.1.50")
		await expect(widgetRateLimit(c, next)).rejects.toThrow("Too many requests")
	})

	it("rate-limits different clients independently when behind same ingress", async () => {
		// Simulate two clients behind same 10.x ingress with different real IPs
		const next1 = mock(async () => {})
		const c1 = createMockContext("203.0.113.10", "10.0.1.50")
		await widgetRateLimit(c1, next1)
		expect(next1).toHaveBeenCalled()

		const next2 = mock(async () => {})
		const c2 = createMockContext("203.0.113.20", "10.0.1.50")
		await widgetRateLimit(c2, next2)
		expect(next2).toHaveBeenCalled()
	})
})
