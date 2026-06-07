import { isIP } from "node:net"
import { lt, sql } from "drizzle-orm"
import type { MiddlewareHandler } from "hono"
import { getConnInfo } from "hono/bun"
import { config } from "@/common/config"
import { TooManyRequestsError } from "@/common/errors"
import { isPrivateIp, trustedProxies } from "@/common/ip"
import { logger } from "@/common/logger"
import { db } from "@/db"
import { widgetIpRateLimits } from "@/db/schema"

/** Probability (0–1) of triggering stale window cleanup on any request. */
const CLEANUP_CHANCE = 0.01

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
	let directIp: string | undefined
	try {
		directIp = getConnInfo(c).remote.address
	} catch {
		// getConnInfo requires a real Bun server socket; in tests with
		// app.request() no server exists so c.env is not an Object.
		directIp = undefined
	}

	const forwarded = c.req.header("X-Forwarded-For")
	const forwardedIp = forwarded?.split(",")[0]?.trim()
	const validForwarded =
		forwardedIp && isIP(forwardedIp) !== 0 ? forwardedIp : undefined

	const isTrustedProxy =
		!!directIp && (trustedProxies.has(directIp) || isPrivateIp(directIp))

	const ip = isTrustedProxy && validForwarded ? validForwarded : directIp

	if (!ip) {
		if (config.isTest) {
			return await next()
		}
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
		cleanupStaleWindows().catch((err) =>
			logger.warn("Rate-limit cleanup failed", { error: err }),
		)
	}

	await next()
}
