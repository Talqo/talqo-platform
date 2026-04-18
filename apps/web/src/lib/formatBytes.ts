/**
 * Formats bytes to human-readable string (B, KB, MB, GB)
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B"

	const sizes = ["B", "KB", "MB", "GB"]
	const k = 1024
	const i = Math.floor(Math.log(bytes) / Math.log(k))

	return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}
