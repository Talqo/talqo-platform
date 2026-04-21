import type { MiddlewareHandler } from "hono"
import { db } from "../../db"
import { adminAccessLogs } from "../../db/schema"

const UUID_PATTERN =
	/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

const MUTATING_METHODS = ["POST", "PATCH", "PUT", "DELETE"]

// Logs every mutating admin action to admin_access_logs (NFR-3.4)
export const adminAuditLog: MiddlewareHandler = async (c, next) => {
	await next()

	const method = c.req.method
	if (!MUTATING_METHODS.includes(method)) return

	const adminId = c.get("adminId" as never) as string
	if (!adminId) return

	const clientId = c.req.path.match(UUID_PATTERN)?.[0]

	await db.insert(adminAccessLogs).values({
		adminId,
		clientId,
		actionType: `${method} ${c.req.path}`,
	})
}
