import { eq } from "drizzle-orm"
import type { MiddlewareHandler } from "hono"
import { db } from "../../db"
import { clients } from "../../db/schema"
import { ForbiddenError, UnauthorizedError } from "../errors"
import { verifyToken } from "../jwt"

// Validates Client JWT from Authorization: Bearer <token>
// Also accepts impersonation JWTs issued by POST /admin/clients/:id/impersonate (FR-3.3)
export const clientAuth: MiddlewareHandler = async (c, next) => {
	const authHeader = c.req.header("Authorization")
	if (!authHeader?.startsWith("Bearer ")) {
		throw new UnauthorizedError("Missing or invalid Authorization header")
	}

	const token = authHeader.slice(7)
	const payload = await verifyToken(token)

	if (payload.role !== "client" && !payload.imp) {
		throw new ForbiddenError("Invalid token role")
	}

	const client = await db
		.select({ id: clients.id, status: clients.status })
		.from(clients)
		.where(eq(clients.id, payload.sub))
		.then((rows) => rows[0])

	if (!client) {
		throw new UnauthorizedError("Client not found")
	}
	if (client.status === "suspended") {
		throw new UnauthorizedError("Account suspended")
	}

	c.set("clientId" as never, payload.sub)
	await next()
}
