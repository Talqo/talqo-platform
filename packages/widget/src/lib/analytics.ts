import { getOrCreateBrowserSessionId } from "@/lib/storage"

export function trackPageview(token: string, apiUrl: string): void {
	if (!token) return
	const browserSessionId = getOrCreateBrowserSessionId()
	fetch(`${apiUrl}/widget/sessions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Widget-Token": token,
		},
		body: JSON.stringify({ browserSessionId }),
	}).catch(() => {})
}
