import { eq } from "drizzle-orm"
import type { MiddlewareHandler } from "hono"
import { UnauthorizedError } from "@/common/errors"
import { db } from "@/db"
import { clients } from "@/db/schema"

// Validates X-Widget-Token header against clients.widget_token (NFR-3.2)
export const widgetAuth: MiddlewareHandler = async (c, next) => {
	const token = c.req.header("X-Widget-Token")
	if (!token) {
		throw new UnauthorizedError("Missing X-Widget-Token header")
	}

	const client = await db
		.select({ id: clients.id, status: clients.status })
		.from(clients)
		.where(eq(clients.widgetToken, token))
		.then((rows) => rows[0])

	if (!client) {
		throw new UnauthorizedError("Invalid widget token")
	}
	if (client.status === "suspended") {
		throw new UnauthorizedError("Account suspended")
	}

	c.set("clientId" as never, client.id)
	await next()
}
