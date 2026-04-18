/**
 * Color utility functions for widget setup
 * Shared between AppearanceCard and other color-related components
 */

/**
 * Expand 3-digit hex to 6-digit: #abc -> #aabbcc
 */
export function expandShortHex(hex: string): string | null {
	if (!/^[0-9a-f]{3}$/i.test(hex)) return null
	return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
}

/**
 * Validate and normalize hex color input
 * Accepts 3-digit or 6-digit hex with optional # prefix
 */
export function normalizeHex(input: string): string | null {
	const trimmed = input.trim().toLowerCase()
	if (!trimmed.startsWith("#")) return null

	const hex = trimmed.slice(1)

	// 3-digit hex: expand to 6
	if (/^[0-9a-f]{3}$/i.test(hex)) {
		return expandShortHex(hex)
	}

	// 6-digit hex: accept as-is
	if (/^[0-9a-f]{6}$/i.test(hex)) {
		return trimmed
	}

	return null
}

/**
 * Parse HSL color string to hex.
 * Accepts multiple formats:
 * - hsl(120 50% 50%) - space-separated (modern)
 * - hsl(120, 50%, 50%) - comma-separated
 * - hsla(120, 50%, 50%, 0.5) - with alpha (alpha is ignored)
 * - hsl(120 50% 50% / 0.5) - space-separated with alpha
 */
export function tryHslToHex(hsl: string): string | null {
	if (hsl.startsWith("#")) return null

	// Normalize the input: handle hsla, commas, and slash-separated alpha
	const normalized = hsl
		.replace(/^hsla?\(/i, "")
		.replace(/\)$/, "")
		.replace(/\//g, ",") // Convert slash to comma for uniform handling
		.replace(/\s+/g, " ") // Normalize whitespace

	// Match: h s% l% (optional alpha)
	const match = normalized.match(
		/^(\d{1,3}(?:\.\d+)?)[,\s]+(\d{1,3}(?:\.\d+)?)%[,\s]+(\d{1,3}(?:\.\d+)?)%/,
	)
	if (!match) return null

	const h = Number(match[1])
	const s = Number(match[2])
	const l = Number(match[3])

	if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) return null

	const hNorm = h / 360
	const sNorm = s / 100
	const lNorm = l / 100

	const hue2rgb = (p: number, q: number, t: number) => {
		if (t < 0) t += 1
		if (t > 1) t -= 1
		if (t < 1 / 6) return p + (q - p) * 6 * t
		if (t < 1 / 2) return q
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
		return p
	}

	const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm
	const p = 2 * lNorm - q
	const r = Math.round(hue2rgb(p, q, hNorm + 1 / 3) * 255)
	const g = Math.round(hue2rgb(p, q, hNorm) * 255)
	const b = Math.round(hue2rgb(p, q, hNorm - 1 / 3) * 255)

	return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}
