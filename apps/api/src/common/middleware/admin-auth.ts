import { and, eq } from "drizzle-orm"
import type { MiddlewareHandler } from "hono"
import { ForbiddenError, UnauthorizedError } from "@/common/errors"
import { type AppVariables, verifyToken } from "@/common/jwt"
import { db } from "@/db"
import { adminUsers } from "@/db/schema"

// Validates Admin JWT from Authorization: Bearer <token>
export const adminAuth: MiddlewareHandler<{ Variables: AppVariables }> = async (
	c,
	next,
) => {
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

	c.set("adminId", payload.sub)
	const wideEvent = c.get("wideEvent")
	if (wideEvent) wideEvent.admin = { id: admin.id }
	await next()
}
