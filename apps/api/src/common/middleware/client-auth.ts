import { eq } from "drizzle-orm"
import type { MiddlewareHandler } from "hono"
import { ForbiddenError, UnauthorizedError } from "@/common/errors"
import { verifyToken } from "@/common/jwt"
import type { Logger } from "@/common/logger"
import type { WideEvent } from "@/common/wide-event.types"
import { db } from "@/db"
import { clients } from "@/db/schema"

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
	// Allow admin impersonation tokens to access suspended clients for support
	if (client.status === "suspended") {
		if (!payload.imp) {
			throw new UnauthorizedError("Account suspended")
		}
		const reqLogger = c.get("logger" as never) as Logger | undefined
		reqLogger?.warn("Admin impersonation on suspended client", {
			action: "admin_impersonation_on_suspended_client",
			clientId: client.id,
			clientStatus: client.status,
		})
	}

	c.set("clientId" as never, payload.sub)
	const wideEvent = c.get("wideEvent" as never) as WideEvent | undefined
	if (wideEvent) {
		wideEvent.client = {
			id: client.id,
			status: client.status as "active" | "suspended",
			...(payload.imp ? { is_impersonated: true as const } : {}),
		}
	}
	await next()
}
