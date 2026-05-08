export function getApiBaseUrl(): string {
	const raw = import.meta.env.VITE_API_URL ?? "http://localhost:3000"
	let url: URL
	try {
		url = new URL(raw)
	} catch {
		throw new Error(
			`Invalid VITE_API_URL: "${raw}". Please provide a valid absolute URL (e.g., "https://api.example.com").`,
		)
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new Error(
			`Invalid VITE_API_URL: "${raw}". URL must use http or https protocol.`,
		)
	}
	return `${raw.replace(/\/$/, "")}/v1`
}
