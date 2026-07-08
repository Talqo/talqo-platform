import { z } from "zod"

function isPrivateIpv4(a: number, b: number): boolean {
	return (
		a === 127 || // loopback
		a === 10 || // RFC-1918
		a === 0 || // this-network
		(a === 172 && b >= 16 && b <= 31) || // RFC-1918
		(a === 192 && b === 168) || // RFC-1918
		(a === 169 && b === 254) // link-local / cloud metadata
	)
}

// Expands a bracket-stripped IPv6 literal (as produced by URL.hostname) into
// its 8 16-bit groups, handling "::" compression and trailing IPv4 groups
// that Bun/Node collapse into hex (e.g. "::ffff:127.0.0.1" -> "::ffff:7f00:1").
function expandIpv6Groups(address: string): number[] | null {
	const ipv4Tail = address.match(/^(.*):(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
	let head = address
	let tailGroups: number[] = []
	if (ipv4Tail) {
		const octets = ipv4Tail[2].split(".").map(Number)
		if (
			octets.length !== 4 ||
			octets.some((o) => Number.isNaN(o) || o < 0 || o > 255)
		)
			return null
		const [o0, o1, o2, o3] = octets as [number, number, number, number]
		tailGroups = [(o0 << 8) | o1, (o2 << 8) | o3]
		head = ipv4Tail[1]
	}

	const parseGroups = (s: string): number[] | null => {
		if (s === "") return []
		const result: number[] = []
		for (const g of s.split(":")) {
			if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null
			result.push(Number.parseInt(g, 16))
		}
		return result
	}

	const parts = head.split("::")
	if (parts.length > 2) return null

	if (parts.length === 1) {
		const groups = parseGroups(parts[0])
		if (!groups) return null
		const full = [...groups, ...tailGroups]
		return full.length === 8 ? full : null
	}

	const left = parseGroups(parts[0])
	const right = parseGroups(parts[1])
	if (!left || !right) return null
	const rightFull = [...right, ...tailGroups]
	const missing = 8 - left.length - rightFull.length
	if (missing < 0) return null
	return [...left, ...Array(missing).fill(0), ...rightFull]
}

function isPrivateIpv6Literal(bareHost: string): boolean {
	const groups = expandIpv6Groups(bareHost)
	if (!groups) return false

	// ::1 — loopback
	if (groups.slice(0, 7).every((g) => g === 0) && groups[7] === 1) return true

	// ::ffff:0:0/96 — IPv4-mapped, check the embedded IPv4 address
	if (groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff) {
		const mapped = groups[6] as number
		if (isPrivateIpv4((mapped >> 8) & 0xff, mapped & 0xff)) return true
	}

	// fc00::/7 — unique local
	if (((groups[0] as number) & 0xfe00) === 0xfc00) return true

	// fe80::/10 — link-local
	if (((groups[0] as number) & 0xffc0) === 0xfe80) return true

	return false
}

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
		if (isPrivateIpv4(a as number, b as number)) return false
	}

	const bare = host.replace(/^\[|\]$/g, "")
	if (bare.includes(":") && isPrivateIpv6Literal(bare)) return false

	return true
}

export const mcpUrlField = z
	.string()
	.url()
	.refine(isPublicHttpsUrl, "URL must be a public HTTPS address")

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
	mcpHttpConfigSchema,
])

// Admins managing pre-made servers may additionally use stdio transports.
export const mcpServerConfigSchema = z.discriminatedUnion("type", [
	mcpStdioConfigSchema,
	mcpHttpConfigSchema,
])

export const mcpConfigBodySchema = z.object({
	mcpConfig: mcpRemoteServerConfigSchema,
})

export const adminMcpConfigBodySchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	mcpConfig: mcpServerConfigSchema,
})

export const adminMcpVerifyBodySchema = z.object({
	mcpConfig: mcpServerConfigSchema,
})

// Client verify endpoint accepts a server ID instead of raw config.
// The API looks up the stored config so clients cannot execute arbitrary commands.
export const clientMcpVerifyByIdBodySchema = z.object({
	serverId: z.string().uuid(),
})

export type McpRemoteServerConfig = z.infer<typeof mcpRemoteServerConfigSchema>
export type McpServerConfigInput = z.infer<typeof mcpServerConfigSchema>
