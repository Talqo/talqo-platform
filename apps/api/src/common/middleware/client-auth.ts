import { eq } from "drizzle-orm"
import type { MiddlewareHandler } from "hono"
import { ForbiddenError, UnauthorizedError } from "@/common/errors"
import { type AppVariables, verifyToken } from "@/common/jwt"
import { db } from "@/db"
import { clients } from "@/db/schema"

// Validates Client JWT from Authorization: Bearer <token>
// Also accepts impersonation JWTs issued by POST /admin/clients/:id/impersonate (FR-3.3)
export const clientAuth: MiddlewareHandler<{
	Variables: AppVariables
}> = async (c, next) => {
	const authHeader = c.req.header("Authorization")
	if (!authHeader?.startsWith("Bearer ")) {
		throw new UnauthorizedError("Missing or invalid Authorization header")
	}

	const token = authHeader.slice(7)
	const payload = await verifyToken(token)

	if (payload.role !== "client") {
		throw new ForbiddenError("Invalid token role")
	}

	const client = await db
		.select({
			id: clients.id,
			status: clients.status,
			tokenVersion: clients.tokenVersion,
		})
		.from(clients)
		.where(eq(clients.id, payload.sub))
		.then((rows) => rows[0])

	if (!client) {
		throw new UnauthorizedError("Client not found")
	}
	if (payload.tokenVersion !== client.tokenVersion) {
		throw new UnauthorizedError(
			"Token has been invalidated. Please log in again.",
		)
	}
	// Allow admin impersonation tokens to access suspended clients for support
	if (client.status === "suspended") {
		if (!payload.imp) {
			throw new UnauthorizedError("Account suspended")
		}
		const reqLogger = c.get("logger")
		reqLogger.warn("Admin impersonation on suspended client", {
			action: "admin_impersonation_on_suspended_client",
			clientId: client.id,
			clientStatus: client.status,
		})
	}

	c.set("clientId", payload.sub)
	const wideEvent = c.get("wideEvent")
	if (wideEvent) {
		wideEvent.client = {
			id: client.id,
			status: client.status as "active" | "suspended",
			...(payload.imp ? { is_impersonated: true as const } : {}),
		}
	}
	await next()
}
