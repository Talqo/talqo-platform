import { isIP } from "node:net"
import type { MiddlewareHandler } from "hono"
import { getConnInfo } from "hono/bun"
import { TooManyRequestsError } from "@/common/errors"
import { isPrivateIp, trustedProxies } from "@/common/ip"

type Window = {
	count: number
	resetAt: number
}

export function createAuthRateLimit(
	maxAttempts: number,
	windowMs: number,
): MiddlewareHandler {
	const windows = new Map<string, Window>()

	setInterval(() => {
		const now = Date.now()
		for (const [key, entry] of windows) {
			if (now >= entry.resetAt) windows.delete(key)
		}
	}, windowMs).unref()

	return async (c, next) => {
		let directIp: string | undefined
		try {
			const connInfo = getConnInfo(c)
			directIp = connInfo.remote.address
		} catch {
			// getConnInfo requires a Bun server environment;
			// in tests using app.fetch() it will throw
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
			// In production this shouldn't happen; in tests without a Bun server,
			// allow the request through rather than blocking unconditionally
			return await next()
		}

		const now = Date.now()
		const entry = windows.get(ip)
		if (entry && now >= entry.resetAt) windows.delete(ip)

		const current = windows.get(ip)
		if (!current) {
			windows.set(ip, { count: 1, resetAt: now + windowMs })
		} else {
			current.count += 1
			if (current.count > maxAttempts) {
				throw new TooManyRequestsError()
			}
		}

		await next()
	}
}

export const authRateLimit = createAuthRateLimit(20, 15 * 60 * 1000)
