import { createMiddleware } from "hono/factory"
import type { AppVariables } from "../logger"

export const requestLogger = createMiddleware<{ Variables: AppVariables }>(
	async (c, next) => {
		const start = Date.now()

		try {
			await next()
		} finally {
			c.get("logger").info("HTTP request", {
				method: c.req.method,
				path: c.req.path,
				status: c.res.status,
				durationMs: Date.now() - start,
			})
		}
	},
)
