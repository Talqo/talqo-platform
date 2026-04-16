import type { ChangeEvent } from "react"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ColorPickerProps {
	label: string
	value: string
	onChange: (value: string) => void
}

function tryHslToHex(hsl: string): string | null {
	if (hsl.startsWith("#")) return null

	// Strict HSL regex: validates proper numeric format and ranges
	// Hue: 0-360 (optional decimal), Saturation/Lightness: 0-100% (optional decimal)
	const match = hsl.match(
		/^hsl\(\s*(\d{1,3}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?)%\s+(\d{1,3}(?:\.\d+)?)%\s*\)$/,
	)
	if (!match) return null

	const h = Number(match[1])
	const s = Number(match[2])
	const l = Number(match[3])

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
	// Draft state allows typing intermediate values before validation
	const [draftValue, setDraftValue] = useState(value)

	// Sync draft with external prop changes
	useEffect(() => {
		setDraftValue(value)
	}, [value])

	const handleColorInputChange = (e: ChangeEvent<HTMLInputElement>) => {
		onChange(e.target.value)
	}

	const handleTextInputChange = (e: ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value
		setDraftValue(newValue)

		const trimmed = newValue.trim().toLowerCase()

		// Validate hex: only #RRGGBB (input type="color" compatible)
		if (trimmed.startsWith("#")) {
			const hex = trimmed.slice(1)
			// Normalize 3-digit RGB to 6-digit
			if (/^[0-9a-f]{3}$/i.test(hex)) {
				const normalized = `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
				// Update draft to normalized value to prevent jump
				setDraftValue(normalized)
				onChange(normalized)
				return
			}
			// Accept 6-digit hex only (ignore 8-digit with alpha)
			if (/^[0-9a-f]{6}$/i.test(hex)) {
				onChange(trimmed)
			}
			return
		}

		// Validate HSL: hsl(h s% l%)
		if (trimmed.startsWith("hsl(")) {
			const converted = tryHslToHex(trimmed)
			if (converted) {
				onChange(trimmed)
			}
		}
	}

	const colorPickerValue = tryHslToHex(value) || value
	// Validate that the color picker receives a proper 6-digit hex
	const isValidHex = /^#([0-9a-f]{6})$/i.test(colorPickerValue)

	return (
		<div className="flex items-center gap-3">
			<Label className="w-32 flex-shrink-0 text-sm">{label}</Label>
			<div className="flex flex-1 items-center gap-2">
				<Input
					type="color"
					value={isValidHex ? colorPickerValue : "#000000"}
					onChange={handleColorInputChange}
					disabled={!isValidHex}
					className="h-9 w-16 p-1 disabled:cursor-not-allowed disabled:opacity-50"
					aria-label={`${label} color picker`}
					aria-invalid={!isValidHex}
				/>
				<Input
					type="text"
					value={draftValue}
					onChange={handleTextInputChange}
					className="flex-1 font-mono text-sm"
					placeholder="#ffffff or hsl(...)"
					aria-label={`${label} color value`}
				/>
			</div>
		</div>
	)
}
