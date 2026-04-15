import { and, eq } from "drizzle-orm"
import type { MiddlewareHandler } from "hono"
import { db } from "../../db"
import { adminAccessLogs, adminUsers } from "../../db/schema"
import { ForbiddenError, UnauthorizedError } from "../errors"
import { verifyToken } from "../jwt"

// Validates Admin JWT from Authorization: Bearer <token>
// Logs every mutating action to admin_access_logs (NFR-3.4)
export const adminAuth: MiddlewareHandler = async (c, next) => {
	const authHeader = c.req.header("Authorization")
	if (!authHeader?.startsWith("Bearer ")) {
		throw new UnauthorizedError("Missing or invalid Authorization header")
	}

	const token = authHeader.slice(7)
	const payload = await verifyToken(token)

	if (payload.role !== "admin") {
		throw new ForbiddenError("Invalid token role")
	}

	const admin = await db
		.select({ id: adminUsers.id })
		.from(adminUsers)
		.where(and(eq(adminUsers.id, payload.sub), eq(adminUsers.isDeleted, false)))
		.then((rows) => rows[0])

	if (!admin) {
		throw new UnauthorizedError("Admin not found")
	}

	c.set("adminId" as never, payload.sub)

	await next()

	// Log mutating admin actions after the handler completes
	const method = c.req.method
	if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
		// Only log client-scoped actions — clientId is NOT NULL in adminAccessLogs,
		// so we must not extract UUIDs from non-client paths (e.g. /admin/conversations/:id)
		// which would produce an FK violation or a silently wrong audit record.
		const isClientRoute = /^\/admin\/clients(?:\/|$)/.test(c.req.path)
		if (isClientRoute) {
			// c.req.param() is not reliable in shared middleware — extract UUID from the real path instead
			const uuidPattern =
				/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
			const clientId = c.req.path.match(uuidPattern)?.[0]
			if (clientId) {
				await db.insert(adminAccessLogs).values({
					adminId: payload.sub,
					clientId,
					actionType: `${method} ${c.req.path}`,
				})
			}
		}
	}
}
