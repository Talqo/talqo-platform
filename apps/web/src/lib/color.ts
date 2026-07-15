export type Hsl = { h: number; s: number; l: number }

export function hexToHsl(hex: string): Hsl {
	const sanitized = hex.replace("#", "")
	const r = Number.parseInt(sanitized.substring(0, 2), 16) / 255
	const g = Number.parseInt(sanitized.substring(2, 4), 16) / 255
	const b = Number.parseInt(sanitized.substring(4, 6), 16) / 255

	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)
	let h = 0
	let s = 0
	const l = (max + min) / 2

	if (max !== min) {
		const d = max - min
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0)
				break
			case g:
				h = (b - r) / d + 2
				break
			case b:
				h = (r - g) / d + 4
				break
		}
		h /= 6
	}

	return { h: h * 360, s: s * 100, l: l * 100 }
}

export function hslToHex({ h, s, l }: Hsl): string {
	const normalizedH = ((h % 360) + 360) % 360
	const normalizedS = Math.max(0, Math.min(100, s)) / 100
	const normalizedL = Math.max(0, Math.min(100, l)) / 100

	const c = (1 - Math.abs(2 * normalizedL - 1)) * normalizedS
	const x = c * (1 - Math.abs(((normalizedH / 60) % 2) - 1))
	const m = normalizedL - c / 2

	let r = 0
	let g = 0
	let b = 0

	if (normalizedH < 60) {
		r = c
		g = x
		b = 0
	} else if (normalizedH < 120) {
		r = x
		g = c
		b = 0
	} else if (normalizedH < 180) {
		r = 0
		g = c
		b = x
	} else if (normalizedH < 240) {
		r = 0
		g = x
		b = c
	} else if (normalizedH < 300) {
		r = x
		g = 0
		b = c
	} else {
		r = c
		g = 0
		b = x
	}

	const toHex = (value: number) => {
		const hex = Math.round((value + m) * 255).toString(16)
		return hex.length === 1 ? `0${hex}` : hex
	}

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function shiftHue(hex: string, degrees: number): string {
	const hsl = hexToHsl(hex)
	hsl.h = (hsl.h + degrees) % 360
	if (hsl.h < 0) hsl.h += 360
	return hslToHex(hsl)
}

const CUSTOM_VARS = [
	"--primary",
	"--primary-foreground",
	"--secondary",
	"--secondary-foreground",
	"--muted",
	"--muted-foreground",
	"--accent",
	"--accent-foreground",
	"--border",
	"--input",
	"--ring",
	"--chart-1",
	"--chart-2",
	"--chart-3",
	"--chart-4",
	"--chart-5",
	"--sidebar-primary",
	"--sidebar-primary-foreground",
	"--sidebar-ring",
]

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value))
}

function withHsl(base: Hsl, saturation: number, lightness: number): string {
	return hslToHex({
		h: base.h,
		s: clamp(saturation, 0, 100),
		l: clamp(lightness, 0, 100),
	})
}

export function isValidHex(hex: string): boolean {
	return /^#[0-9a-fA-F]{6}$/.test(hex)
}

export function getContrastColor(hex: string): string {
	const { l } = hexToHsl(hex)
	return l > 55 ? "#09090b" : "#ffffff"
}

export function generateCustomPalette(
	hex: string,
	isDark: boolean,
): Record<string, string> {
	const base = hexToHsl(hex)
	const palette: Record<string, string> = {}

	if (!isDark) {
		palette["--primary"] = hex
		palette["--primary-foreground"] = getContrastColor(hex)
		palette["--secondary"] = withHsl(base, base.s, 96)
		palette["--secondary-foreground"] = withHsl(base, base.s, 18)
		palette["--muted"] = "#f4f4f5"
		palette["--muted-foreground"] = "#71717a"
		palette["--accent"] = withHsl(base, base.s, 96)
		palette["--accent-foreground"] = withHsl(base, base.s, 18)
		palette["--border"] = withHsl(base, base.s, 86)
		palette["--input"] = withHsl(base, base.s, 86)
		palette["--ring"] = hex
		palette["--chart-1"] = hex
		palette["--chart-2"] = withHsl(base, base.s, 58)
		palette["--chart-3"] = withHsl(base, base.s, 68)
		palette["--chart-4"] = withHsl(base, base.s, 78)
		palette["--chart-5"] = withHsl(base, base.s, 88)
		palette["--sidebar-primary"] = hex
		palette["--sidebar-primary-foreground"] = getContrastColor(hex)
		palette["--sidebar-ring"] = hex
	} else {
		const primary = withHsl(base, base.s, 62)
		palette["--primary"] = primary
		palette["--primary-foreground"] = withHsl(base, base.s, 8)
		palette["--secondary"] = withHsl(base, 30, 14)
		palette["--secondary-foreground"] = "#fafafa"
		palette["--muted"] = withHsl(base, 20, 14)
		palette["--muted-foreground"] = "#a1a1aa"
		palette["--accent"] = withHsl(base, 35, 18)
		palette["--accent-foreground"] = "#fafafa"
		palette["--border"] = withHsl(base, 25, 22)
		palette["--input"] = withHsl(base, 25, 22)
		palette["--ring"] = primary
		palette["--chart-1"] = primary
		palette["--chart-2"] = withHsl(base, base.s, 50)
		palette["--chart-3"] = withHsl(base, base.s, 60)
		palette["--chart-4"] = withHsl(base, base.s, 74)
		palette["--chart-5"] = withHsl(base, base.s, 88)
		palette["--sidebar-primary"] = primary
		palette["--sidebar-primary-foreground"] = withHsl(base, base.s, 8)
		palette["--sidebar-ring"] = primary
	}

	return palette
}

export function applyCustomPalette(root: HTMLElement, hex: string) {
	const isDark = root.classList.contains("dark")
	const palette = generateCustomPalette(hex, isDark)
	for (const [key, value] of Object.entries(palette)) {
		root.style.setProperty(key, value)
	}
}

export function clearCustomPalette(root: HTMLElement) {
	for (const key of CUSTOM_VARS) {
		root.style.removeProperty(key)
	}
}
