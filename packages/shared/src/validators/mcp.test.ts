import { describe, expect, it } from "bun:test"
import { adminMcpConfigBodySchema, mcpConfigBodySchema } from "./mcp"

// ─── Client schema (remote only) ──────────────────────────────────────────────

describe("mcpConfigBodySchema (client)", () => {
	describe("accepted configs", () => {
		it("accepts a valid SSE config", () => {
			const result = mcpConfigBodySchema.safeParse({
				mcpConfig: { type: "sse", url: "https://mcp.example.com/sse" },
			})
			expect(result.success).toBe(true)
		})

		it("accepts a valid HTTP config", () => {
			const result = mcpConfigBodySchema.safeParse({
				mcpConfig: { type: "http", url: "https://mcp.example.com/mcp" },
			})
			expect(result.success).toBe(true)
		})

		it("accepts optional headers", () => {
			const result = mcpConfigBodySchema.safeParse({
				mcpConfig: {
					type: "sse",
					url: "https://mcp.example.com/sse",
					headers: { Authorization: "Bearer token" },
				},
			})
			expect(result.success).toBe(true)
		})

		it("strips unknown keys", () => {
			const result = mcpConfigBodySchema.safeParse({
				mcpConfig: {
					type: "http",
					url: "https://mcp.example.com/mcp",
					command: "/bin/sh",
				},
			})
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.mcpConfig).not.toHaveProperty("command")
			}
		})
	})

	describe("rejects stdio", () => {
		it("rejects a stdio config", () => {
			const result = mcpConfigBodySchema.safeParse({
				mcpConfig: { type: "stdio", command: "npx", args: ["-y", "some-mcp"] },
			})
			expect(result.success).toBe(false)
		})
	})

	describe("rejects non-HTTPS URLs", () => {
		it("rejects http://", () => {
			const result = mcpConfigBodySchema.safeParse({
				mcpConfig: { type: "sse", url: "http://mcp.example.com/sse" },
			})
			expect(result.success).toBe(false)
		})

		it("rejects file:// URLs", () => {
			const result = mcpConfigBodySchema.safeParse({
				mcpConfig: { type: "sse", url: "file:///etc/passwd" },
			})
			expect(result.success).toBe(false)
		})
	})

	describe("rejects private/loopback addresses", () => {
		const cases: [string, string][] = [
			["localhost", "https://localhost/mcp"],
			["127.0.0.1 (loopback)", "https://127.0.0.1/mcp"],
			["0.0.0.0", "https://0.0.0.0/mcp"],
			["10.x RFC-1918", "https://10.0.0.1/mcp"],
			["172.16.x RFC-1918", "https://172.16.0.1/mcp"],
			["172.31.x RFC-1918", "https://172.31.255.255/mcp"],
			["192.168.x RFC-1918", "https://192.168.1.1/mcp"],
			[
				"169.254.x link-local/metadata",
				"https://169.254.169.254/latest/meta-data/",
			],
			["IPv6 loopback ::1", "https://[::1]/mcp"],
		]

		for (const [label, url] of cases) {
			it(`rejects ${label}`, () => {
				const result = mcpConfigBodySchema.safeParse({
					mcpConfig: { type: "sse", url },
				})
				expect(result.success).toBe(false)
			})
		}
	})

	describe("rejects malformed input", () => {
		it("rejects a missing type", () => {
			const result = mcpConfigBodySchema.safeParse({
				mcpConfig: { url: "https://mcp.example.com/sse" },
			})
			expect(result.success).toBe(false)
		})

		it("rejects a non-URL string", () => {
			const result = mcpConfigBodySchema.safeParse({
				mcpConfig: { type: "sse", url: "not-a-url" },
			})
			expect(result.success).toBe(false)
		})

		it("rejects an empty object", () => {
			const result = mcpConfigBodySchema.safeParse({ mcpConfig: {} })
			expect(result.success).toBe(false)
		})
	})
})

// ─── Admin schema (all transports) ────────────────────────────────────────────

describe("adminMcpConfigBodySchema (admin)", () => {
	it("accepts a stdio config", () => {
		const result = adminMcpConfigBodySchema.safeParse({
			mcpConfig: {
				type: "stdio",
				command: "npx",
				args: ["-y", "@mcp/weather"],
			},
		})
		expect(result.success).toBe(true)
	})

	it("rejects a stdio config with empty command", () => {
		const result = adminMcpConfigBodySchema.safeParse({
			mcpConfig: { type: "stdio", command: "" },
		})
		expect(result.success).toBe(false)
	})

	it("accepts a valid SSE config", () => {
		const result = adminMcpConfigBodySchema.safeParse({
			mcpConfig: { type: "sse", url: "https://mcp.example.com/sse" },
		})
		expect(result.success).toBe(true)
	})

	it("accepts a valid HTTP config", () => {
		const result = adminMcpConfigBodySchema.safeParse({
			mcpConfig: { type: "http", url: "https://mcp.example.com/mcp" },
		})
		expect(result.success).toBe(true)
	})

	it("rejects an unknown type", () => {
		const result = adminMcpConfigBodySchema.safeParse({
			mcpConfig: { type: "ws", url: "wss://mcp.example.com" },
		})
		expect(result.success).toBe(false)
	})
})
