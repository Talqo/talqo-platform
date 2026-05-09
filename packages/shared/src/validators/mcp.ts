import { z } from "zod"

// Blocks literal private/loopback addresses and enforces HTTPS.
// Does NOT prevent DNS rebinding — network-level egress filtering is needed for that.
function isPublicHttpsUrl(raw: string): boolean {
	let url: URL
	try {
		url = new URL(raw)
	} catch {
		return false
	}

	if (url.protocol !== "https:") return false

	const host = url.hostname

	if (host === "localhost") return false

	// IPv4 private/loopback/link-local ranges
	const ipv4 = host.split(".")
	if (ipv4.length === 4) {
		const [a, b] = ipv4.map(Number)
		if (
			a === 127 || // loopback
			a === 10 || // RFC-1918
			a === 0 || // this-network
			(a === 172 && b >= 16 && b <= 31) || // RFC-1918
			(a === 192 && b === 168) || // RFC-1918
			(a === 169 && b === 254) // link-local / cloud metadata
		)
			return false
	}

	// IPv6 loopback
	const bare = host.replace(/^\[|\]$/g, "")
	if (bare === "::1" || bare === "0:0:0:0:0:0:0:1") return false

	return true
}

const mcpUrlField = z
	.string()
	.url()
	.refine(isPublicHttpsUrl, "URL must be a public HTTPS address")

const mcpSseConfigSchema = z.object({
	type: z.literal("sse"),
	url: mcpUrlField,
	headers: z.record(z.string(), z.string()).optional(),
})

const mcpHttpConfigSchema = z.object({
	type: z.literal("http"),
	url: mcpUrlField,
	headers: z.record(z.string(), z.string()).optional(),
})

const mcpStdioConfigSchema = z.object({
	type: z.literal("stdio"),
	command: z.string().min(1),
	args: z.array(z.string()).optional(),
	env: z.record(z.string(), z.string()).optional(),
})

// Clients may only register remote (URL-based) MCP servers — no subprocess spawning.
export const mcpRemoteServerConfigSchema = z.discriminatedUnion("type", [
	mcpSseConfigSchema,
	mcpHttpConfigSchema,
])

// Admins managing pre-made servers may additionally use stdio transports.
export const mcpServerConfigSchema = z.discriminatedUnion("type", [
	mcpStdioConfigSchema,
	mcpSseConfigSchema,
	mcpHttpConfigSchema,
])

export const mcpConfigBodySchema = z.object({
	mcpConfig: mcpRemoteServerConfigSchema,
})

export const adminMcpConfigBodySchema = z.object({
	mcpConfig: mcpServerConfigSchema,
})

export type McpRemoteServerConfig = z.infer<typeof mcpRemoteServerConfigSchema>
export type McpServerConfigInput = z.infer<typeof mcpServerConfigSchema>
