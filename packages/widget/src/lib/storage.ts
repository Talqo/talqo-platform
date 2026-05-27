export const THEME_STORAGE_KEY = "pagepal:widget:theme"
export const BROWSER_SESSION_ID_KEY = "pagepal:widget:sessionId"

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function safeGetItem(key: string): string | null {
	try {
		return localStorage.getItem(key)
	} catch {
		return null
	}
}

export function safeSetItem(key: string, value: string): void {
	try {
		localStorage.setItem(key, value)
	} catch {
		// localStorage may be unavailable in restricted environments
	}
}

export function getOrCreateBrowserSessionId(): string {
	if (typeof window === "undefined") return ""
	const existing = safeGetItem(BROWSER_SESSION_ID_KEY)
	if (existing && UUID_RE.test(existing)) return existing
	const id = crypto.randomUUID()
	safeSetItem(BROWSER_SESSION_ID_KEY, id)
	return id
}

export function getInitialTheme(): "light" | "dark" {
	if (typeof window === "undefined") return "light"

	const savedTheme = safeGetItem(THEME_STORAGE_KEY)
	if (savedTheme === "dark" || savedTheme === "light") {
		return savedTheme
	}

	if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
		return "dark"
	}

	return "light"
}
