type LogLevel = "info" | "warn" | "error";

export type Logger = {
	info: (message: string, meta?: Record<string, unknown>) => void;
	warn: (message: string, meta?: Record<string, unknown>) => void;
	error: (message: string, meta?: Record<string, unknown>) => void;
	withContext: (context: Record<string, unknown>) => Logger;
};

// AppVariables is used to type Hono context across the app — keeps Variables in sync with logger
export type AppVariables = { logger: Logger };

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
			...boundContext,
			...meta,
		};

		const line = `${JSON.stringify(entry)}\n`;

		if (level === "error") {
			process.stderr.write(line);
		} else {
			process.stdout.write(line);
		}
	}

	return {
		info: (message, meta) => log("info", message, meta),
		warn: (message, meta) => log("warn", message, meta),
		error: (message, meta) => log("error", message, meta),
		withContext: (context) => makeLogger({ ...boundContext, ...context }),
	};
}

export const logger = makeLogger();
