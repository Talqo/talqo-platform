// Drizzle moves the real Postgres error code from `.code` to `.cause.code`
export function getPostgresErrorCode(err: unknown): string | undefined {
	if (typeof err !== "object" || err === null) return undefined
	if ("code" in err && typeof err.code === "string") return err.code
	if (
		"cause" in err &&
		typeof err.cause === "object" &&
		err.cause !== null &&
		"code" in err.cause &&
		typeof err.cause.code === "string"
	) {
		return err.cause.code
	}
	return undefined
}
