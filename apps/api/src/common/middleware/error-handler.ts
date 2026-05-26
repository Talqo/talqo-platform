import * as Sentry from "@sentry/bun"
import type { ErrorHandler } from "hono"
import { AppError } from "@/common/errors"
import { logger } from "@/common/logger"

export const errorHandler: ErrorHandler = (err, c) => {
	Sentry.withScope((scope) => {
		scope.setTag("request_id", c.get("requestId") ?? "")
		scope.setTag("method", c.req.method)
		scope.setTag("path", c.req.path)
		if (err instanceof AppError) {
			scope.setTag("status_code", String(err.statusCode))
		}
		Sentry.captureException(err)
	})

	if (err instanceof AppError) {
		return c.json(
			{
				error: { code: err.code, message: err.message },
			},
			err.statusCode as 400 | 401 | 403 | 404 | 409 | 422 | 500,
		)
	}

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
