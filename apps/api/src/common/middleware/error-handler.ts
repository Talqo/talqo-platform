import type { ErrorHandler } from "hono";
import { AppError } from "../errors";
import { logger } from "../logger";

export const errorHandler: ErrorHandler = (err, c) => {
	if (err instanceof AppError) {
		return c.json(
			{
				success: false,
				error: { code: err.code, message: err.message },
			},
			err.statusCode as 400 | 401 | 403 | 404 | 409 | 422 | 500,
		);
	}

	logger.error("Unhandled error", {
		message: err.message,
		stack: err.stack,
	});
	return c.json(
		{
			success: false,
			error: {
				code: "INTERNAL_ERROR",
				message: "An unexpected error occurred",
			},
		},
		500,
	);
};
