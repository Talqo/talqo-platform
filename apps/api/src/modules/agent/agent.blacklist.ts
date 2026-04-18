export function checkBlacklist(text: string, blacklist: string[]): boolean {
	if (blacklist.length === 0) return false
	return blacklist.some((word) => {
		const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
		return new RegExp(`\\b${escaped}\\b`, "i").test(text)
	})
}
