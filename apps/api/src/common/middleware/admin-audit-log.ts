import type { MiddlewareHandler } from "hono"
import type { AppVariables } from "@/common/jwt"
import type { AuditLogEntry } from "@/modules/admin/admin-audit-log.repository"

const CLIENT_ID_PATTERN =
	/\/admin\/clients\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i

const MUTATING_METHODS = ["POST", "PATCH", "PUT", "DELETE"]

// Logs every mutating admin action to admin_access_logs (NFR-3.4)
export function createAdminAuditLog(
	logFn: (entry: AuditLogEntry) => Promise<void>,
): MiddlewareHandler<{ Variables: AppVariables }> {
	return async (c, next) => {
		await next()

		const method = c.req.method
		if (!MUTATING_METHODS.includes(method)) return
		if (c.res.status >= 400) return

		const adminId = c.get("adminId")
		const clientId = c.req.path.match(CLIENT_ID_PATTERN)?.[1]
		const actionLabel = c.get("auditActionLabel")
		const actionType = actionLabel ?? `${method} ${c.req.path}`

		try {
			await logFn({ adminId, clientId, actionType })
		} catch (err) {
			c.get("logger").error("Failed to write admin audit log", {
				adminId,
				clientId,
				actionType,
				error: err,
			})
		}
	}
}
