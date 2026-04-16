import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ColorPickerProps {
	label: string
	value: string
	onChange: (value: string) => void
}

function tryHslToHex(hsl: string): string | null {
	if (hsl.startsWith("#")) return null

	// Stricter HSL regex: requires percentages for S and L, validates ranges
	const match = hsl.match(/^hsl\(\s*(\d{1,3})\s+([\d.]+)%\s+([\d.]+)%\s*\)$/)
	if (!match) return null

	const h = Number.parseInt(match[1], 10)
	const s = Number.parseFloat(match[2])
	const l = Number.parseFloat(match[3])

	// Validate ranges
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

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
	const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange(e.target.value)
	}

	const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value.trim().toLowerCase()

		// Validate hex: #RGB, #RRGGBB, #RRGGBBAA
		if (newValue.startsWith("#")) {
			const hex = newValue.slice(1)
			if (/^[0-9a-f]{3}$|^[0-9a-f]{6}$|^[0-9a-f]{8}$/i.test(hex)) {
				onChange(newValue)
			}
			return
		}

		// Validate HSL: hsl(h s% l%)
		if (newValue.startsWith("hsl(")) {
			const converted = tryHslToHex(newValue)
			if (converted) {
				onChange(newValue)
			}
		}
	}

	const colorPickerValue = tryHslToHex(value) || value

	return (
		<div className="flex items-center gap-3">
			<Label className="w-32 flex-shrink-0 text-sm">{label}</Label>
			<div className="flex flex-1 items-center gap-2">
				<Input
					type="color"
					value={colorPickerValue}
					onChange={handleColorInputChange}
					className="h-9 w-16 p-1"
					aria-label={`${label} color picker`}
				/>
				<Input
					type="text"
					value={value}
					onChange={handleTextInputChange}
					className="flex-1 font-mono text-sm"
					placeholder="#ffffff or hsl(...)"
					aria-label={`${label} color value`}
				/>
			</div>
		</div>
	)
}
