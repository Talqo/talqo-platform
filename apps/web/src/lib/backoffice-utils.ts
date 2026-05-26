export function formatPeriod(period: string): string {
	const date = new Date(period)
	if (Number.isNaN(date.getTime())) return ""
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	})
}
