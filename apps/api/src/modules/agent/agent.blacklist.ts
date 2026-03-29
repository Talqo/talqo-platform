export function checkBlacklist(text: string, blacklist: string[]): boolean {
	if (blacklist.length === 0) return false;
	const lowerText = text.toLowerCase();
	return blacklist.some((word) => lowerText.includes(word.toLowerCase()));
}
