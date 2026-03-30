import { eq } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import { db } from "../../db";
import { adminAccessLogs, adminUsers } from "../../db/schema";
import { UnauthorizedError } from "../errors";
import { verifyToken } from "../jwt";

// Validates Admin JWT from Authorization: Bearer <token>
// Logs every mutating action to admin_access_logs (NFR-3.4)
export const adminAuth: MiddlewareHandler = async (c, next) => {
	const authHeader = c.req.header("Authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		throw new UnauthorizedError("Missing or invalid Authorization header");
	}

	const token = authHeader.slice(7);
	const payload = await verifyToken(token);

	if (payload.role !== "admin") {
		throw new UnauthorizedError("Invalid token role");
	}

	const admin = await db
		.select({ id: adminUsers.id })
		.from(adminUsers)
		.where(eq(adminUsers.id, payload.sub))
		.then((rows) => rows[0]);

	if (!admin) {
		throw new UnauthorizedError("Admin not found");
	}

	c.set("adminId" as never, payload.sub);

	await next();

	// Log mutating admin actions after the handler completes
	const method = c.req.method;
	if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
		// Best-effort: extract clientId from URL if present
		const clientId = c.req.param("clientId" as never) as string | undefined;
		if (clientId) {
			await db.insert(adminAccessLogs).values({
				adminId: payload.sub,
				clientId,
				actionType: `${method} ${c.req.path}`,
			});
		}
	}
};
