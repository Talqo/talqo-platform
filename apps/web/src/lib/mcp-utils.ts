import type { KvPair } from "@/schemas/mcp"

export function recordToKvPairs(
	record: Record<string, string> | undefined,
): KvPair[] {
	if (!record) return []
	return Object.entries(record).map(([key, value]) => ({ key, value }))
}

export function kvPairsToRecord(
	pairs: KvPair[] | undefined,
): Record<string, string> | undefined {
	if (!pairs || pairs.length === 0) return undefined
	const result: Record<string, string> = {}
	for (const { key, value } of pairs) {
		if (key) result[key] = value
	}
	return Object.keys(result).length > 0 ? result : undefined
}
