type LogLevel = "info" | "warn" | "error"

export type Logger = {
	info: (message: string, meta?: Record<string, unknown>) => void
	warn: (message: string, meta?: Record<string, unknown>) => void
	error: (message: string, meta?: Record<string, unknown>) => void
	withContext: (context: Record<string, unknown>) => Logger
}

function sanitize(context: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(context).map(([key, value]) => {
			if (!(value instanceof Error)) return [key, value]
			const error = value as Error & { code?: unknown; statusCode?: unknown }
			return [
				key,
				{
					name: error.name,
					message: error.message,
					...(typeof error.code === "string" ? { code: error.code } : {}),
					...(typeof error.statusCode === "number"
						? { statusCode: error.statusCode }
						: {}),
				},
			]
		}),
	)
}

function makeLogger(boundContext: Record<string, unknown> = {}): Logger {
	function log(
		level: LogLevel,
		message: string,
		meta?: Record<string, unknown>,
	) {
		const entry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			...sanitize(boundContext),
			...sanitize(meta ?? {}),
		}

		const line = `${JSON.stringify(entry)}\n`

		if (level === "error") {
			process.stderr.write(line)
		} else {
			process.stdout.write(line)
		}
	}

	return {
		info: (message, meta) => log("info", message, meta),
		warn: (message, meta) => log("warn", message, meta),
		error: (message, meta) => log("error", message, meta),
		withContext: (context) => makeLogger({ ...boundContext, ...context }),
	}
}

export const logger = makeLogger()
