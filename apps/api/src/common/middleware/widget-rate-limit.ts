import { isIP } from "node:net"
import { lt, sql } from "drizzle-orm"
import type { MiddlewareHandler } from "hono"
import { getConnInfo } from "hono/bun"
import { config } from "@/common/config"
import { TooManyRequestsError } from "@/common/errors"
import { db } from "@/db"
import { widgetIpRateLimits } from "@/db/schema"

/** Probability (0–1) of triggering stale window cleanup on any request. */
const CLEANUP_CHANCE = 0.01

const trustedProxies = new Set(
	config.TRUSTED_PROXY_IPS?.split(",")
		.map((s) => s.trim())
		.filter(Boolean) ?? [],
)

function isPrivateIp(ip: string): boolean {
	if (!ip) return false
	// IPv4 private ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x, loopback
	if (ip.startsWith("10.")) return true
	if (ip.startsWith("172.")) {
		const second = Number(ip.split(".")[1])
		return second >= 16 && second <= 31
	}
	if (ip.startsWith("192.168.")) return true
	if (ip.startsWith("127.")) return true
	// ::1/128 loopback
	if (ip === "::1") return true
	// fc00::/7 unique local addresses
	if (ip.toLowerCase().startsWith("fc") || ip.toLowerCase().startsWith("fd"))
		return true
	// fe80::/10 link-local
	if (ip.toLowerCase().startsWith("fe8")) return true
	return false
}

/** Delete rate-limit rows for windows older than 24 hours. */
async function cleanupStaleWindows() {
	const cutoff = new Date(Date.now() - 24 * 3_600_000)
	await db
		.delete(widgetIpRateLimits)
		.where(lt(widgetIpRateLimits.window, cutoff))
}

export const widgetRateLimit: MiddlewareHandler = async (c, next) => {
	// Extract real client IP: when behind a known proxy, read X-Forwarded-For.
	// Otherwise fall back to the direct TCP source address.
	const connInfo = getConnInfo(c)
	const directIp = connInfo.remote.address

	const forwarded = c.req.header("X-Forwarded-For")
	const forwardedIp = forwarded?.split(",")[0]?.trim()
	const validForwarded =
		forwardedIp && isIP(forwardedIp) !== 0 ? forwardedIp : undefined

	const isTrustedProxy =
		!!directIp && (trustedProxies.has(directIp) || isPrivateIp(directIp))

	const ip =
		isTrustedProxy && validForwarded
			? validForwarded
			: directIp || validForwarded

	if (!ip) {
		throw new TooManyRequestsError(
			"Rate limiting unavailable: unable to determine client IP",
		)
	}

	// Truncate current time to the hour
	const window = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000)

	// Atomic upsert: increment count, return new count
	const [row] = await db
		.insert(widgetIpRateLimits)
		.values({ ip, window, count: 1 })
		.onConflictDoUpdate({
			target: [widgetIpRateLimits.ip, widgetIpRateLimits.window],
			set: { count: sql`${widgetIpRateLimits.count} + 1` },
		})
		.returning({ count: widgetIpRateLimits.count })

	if (row && row.count > config.WIDGET_RATE_LIMIT_PER_HOUR) {
		throw new TooManyRequestsError()
	}

	// Probabilistic cleanup so stale rows don't accumulate forever
	if (Math.random() < CLEANUP_CHANCE) {
		cleanupStaleWindows().catch(() => {})
	}

	await next()
}
