import type { MiddlewareHandler } from "hono"
import { db } from "../../db"
import { adminAccessLogs } from "../../db/schema"

const CLIENT_ID_PATTERN =
	/\/admin\/clients\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i

const MUTATING_METHODS = ["POST", "PATCH", "PUT", "DELETE"]

// Logs every mutating admin action to admin_access_logs (NFR-3.4)
export const adminAuditLog: MiddlewareHandler = async (c, next) => {
	await next()

	const method = c.req.method
	if (!MUTATING_METHODS.includes(method)) return
	if (c.res.status >= 400) return

	const adminId = c.get("adminId" as never) as string
	if (!adminId) return

	const clientId = c.req.path.match(CLIENT_ID_PATTERN)?.[1]
	const actionType = `${method} ${c.req.path}`

	try {
		await db.insert(adminAccessLogs).values({ adminId, clientId, actionType })
	} catch (err) {
		const logger = c.get("logger" as never) as import("../logger").Logger
		logger.error("Failed to write admin audit log", {
			adminId,
			clientId,
			actionType,
			error: err,
		})
		throw err
	}
}
