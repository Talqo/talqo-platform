import * as Sentry from "@sentry/bun"
import type { ErrorHandler } from "hono"
import { AppError } from "@/common/errors"
import { logger } from "@/common/logger"

export const errorHandler: ErrorHandler = (err, c) => {
	if (err instanceof AppError) {
		if (err.statusCode >= 500) {
			Sentry.withScope((scope) => {
				scope.setTag("request_id", c.get("requestId") ?? "")
				scope.setTag("method", c.req.method)
				scope.setTag("path", c.req.path)
				scope.setTag("status_code", String(err.statusCode))
				Sentry.captureException(err)
			})
		}
		return c.json(
			{
				error: { code: err.code, message: err.message },
			},
			err.statusCode as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500,
		)
	}

	// Unhandled error — real bugs, always track
	Sentry.withScope((scope) => {
		scope.setTag("request_id", c.get("requestId") ?? "")
		scope.setTag("method", c.req.method)
		scope.setTag("path", c.req.path)
		scope.setTag("status_code", "500")
		Sentry.captureException(err)
	})

	logger.error("Unhandled error", {
		message: err.message,
		stack: err.stack,
	})
	return c.json(
		{
			error: {
				code: "INTERNAL_ERROR",
				message: "An unexpected error occurred",
			},
		},
		500,
	)
}
