import { createMiddleware } from "hono/factory"
import { config } from "@/common/config"
import { AppError } from "@/common/errors"
import type { AppVariables } from "@/common/jwt"
import type { EventExporter, WideEvent } from "@/common/wide-event.types"

export function createWideEventMiddleware(exporters: EventExporter[] = []) {
	return createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
		const start = Date.now()

		const event: WideEvent = {
			request_id: c.get("requestId"),
			timestamp: new Date().toISOString(),
			method: c.req.method,
			path: c.req.path,
			service: config.SERVICE_NAME,
			version: config.SERVICE_VERSION,
			deployment_id: config.DEPLOYMENT_ID,
			region: config.REGION,
		}

		c.set("wideEvent", event)

		try {
			await next()
			event.status_code = c.res.status
			event.outcome = c.res.status >= 400 ? "error" : "success"
		} catch (err) {
			event.status_code = err instanceof AppError ? err.statusCode : 500
			event.outcome = "error"
			event._originalError = err
			event.error = {
				type: err instanceof Error ? err.constructor.name : "UnknownError",
				message: err instanceof Error ? err.message : String(err),
				code: (err as Record<string, unknown>).code as string | undefined,
				retriable: ((err as Record<string, unknown>).retriable ??
					false) as boolean,
			}
			throw err
		} finally {
			event.duration_ms = Date.now() - start
			const { _originalError: _, ...loggableEvent } = event
			c.get("logger").info(
				"wide_event",
				loggableEvent as unknown as Record<string, unknown>,
			)
			for (const exporter of exporters) {
				try {
					exporter.export(event)
				} catch {
					// Exporter failures must not affect the response or suppress the original error
				}
			}
		}
	})
}

export const wideEventMiddleware = createWideEventMiddleware()
