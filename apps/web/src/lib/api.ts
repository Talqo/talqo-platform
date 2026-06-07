export function getApiBaseUrl(): string {
	const raw =
		import.meta.env.VITE_API_URL ??
		(import.meta.env.DEV ? "http://localhost:3000/v1" : undefined)

	if (!raw) {
		throw new Error(
			"VITE_API_URL is required in production builds. Set it in your environment or .env file.",
		)
	}

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
	return url.href.replace(/\/$/, "")
}
