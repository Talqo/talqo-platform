export function formatPeriod(period: string, locale?: string): string {
	const date = new Date(period)
	if (Number.isNaN(date.getTime())) return ""
	let safeLocale = locale ?? "en-US"
	try {
		Intl.getCanonicalLocales(safeLocale)
	} catch {
		safeLocale = "en-US"
	}
	return date.toLocaleDateString(safeLocale, {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	})
}
