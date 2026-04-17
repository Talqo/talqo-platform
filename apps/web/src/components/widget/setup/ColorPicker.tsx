import type { ChangeEvent, KeyboardEvent } from "react"
import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ColorPickerProps {
	label: string
	value: string
	onChange: (value: string) => void
}

// Expand 3-digit hex to 6-digit: #abc -> #aabbcc
function expandShortHex(hex: string): string | null {
	if (!/^[0-9a-f]{3}$/i.test(hex)) return null
	return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
}

// Validate and normalize hex on commit
function normalizeHex(input: string): string | null {
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

function tryHslToHex(hsl: string): string | null {
	if (hsl.startsWith("#")) return null

	// Strict HSL regex: validates proper numeric format and ranges
	// Hue: 0-360 (optional decimal), Saturation/Lightness: 0-100% (optional decimal)
	const match = hsl.match(
		/^hsl\(\s*(\d{1,3}(?:\.\d+)?)\s(\d{1,3}(?:\.\d+)?)%\s(\d{1,3}(?:\.\d+)?)%\s*\)$/,
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
	const [isValid, setIsValid] = useState(true)

	// Sync draft with external prop changes
	useEffect(() => {
		setDraftValue(value)
		setIsValid(true)
	}, [value])

	const handleColorInputChange = (e: ChangeEvent<HTMLInputElement>) => {
		onChange(e.target.value)
	}

	// Validate on every keystroke but don't auto-expand 3-digit hex
	const handleTextInputChange = (e: ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value
		setDraftValue(newValue)

		const trimmed = newValue.trim().toLowerCase()

		// Allow partial input during typing
		if (trimmed === "" || trimmed === "#") {
			setIsValid(true)
			return
		}

		// Validate hex: allow 3, 4, 5, or 6 hex digits while typing
		if (trimmed.startsWith("#")) {
			const hex = trimmed.slice(1)
			// Allow up to 6 hex digits while typing (don't expand yet)
			if (/^[0-9a-f]{0,6}$/i.test(hex)) {
				setIsValid(true)
				// Only commit valid 6-digit hex immediately
				if (hex.length === 6) {
					onChange(trimmed)
				}
			} else {
				setIsValid(false)
			}
			return
		}

		// Validate HSL: don't accept until fully valid
		if (trimmed.startsWith("hsl(")) {
			const converted = tryHslToHex(trimmed)
			setIsValid(!!converted)
			if (converted) {
				onChange(trimmed)
			}
			return
		}

		// Any other format is invalid
		setIsValid(false)
	}

	// Commit value on blur - normalize 3-digit hex here
	const handleBlur = () => {
		const trimmed = draftValue.trim().toLowerCase()

		// Try to normalize hex (handles 3-digit expansion)
		const normalized = normalizeHex(trimmed)
		if (normalized) {
			setDraftValue(normalized)
			onChange(normalized)
			setIsValid(true)
			return
		}

		// Check HSL validity
		if (trimmed.startsWith("hsl(")) {
			const converted = tryHslToHex(trimmed)
			if (converted) {
				onChange(trimmed)
				setIsValid(true)
			} else {
				setIsValid(false)
			}
			return
		}

		// If it's the exact current value, it's valid
		if (trimmed === value.toLowerCase()) {
			setIsValid(true)
			return
		}

		// Otherwise mark as invalid
		setIsValid(false)
	}

	// Handle Enter key to commit
	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			handleBlur()
		}
	}

	const colorPickerValue = tryHslToHex(value) || value
	// Validate that the color picker receives a proper 6-digit hex
	const isValidHex = /^#([0-9a-f]{6})$/i.test(colorPickerValue)

	return (
		<div className="space-y-2">
			<Label className="font-medium text-sm">{label}</Label>
			<div className="flex items-center gap-3">
				<Input
					type="color"
					value={isValidHex ? colorPickerValue : "#000000"}
					onChange={handleColorInputChange}
					disabled={!isValidHex}
					className="h-10 w-20 flex-shrink-0 p-1 disabled:cursor-not-allowed disabled:opacity-50"
					aria-label={`${label} color picker`}
					aria-invalid={!isValidHex}
				/>
				<Input
					type="text"
					value={draftValue}
					onChange={handleTextInputChange}
					onBlur={handleBlur}
					onKeyDown={handleKeyDown}
					className={`flex-1 font-mono text-sm ${!isValid ? "border-destructive focus-visible:ring-destructive" : ""}`}
					placeholder="#ffffff or hsl(...)"
					aria-label={`${label} color value`}
					aria-invalid={!isValid}
				/>
			</div>
		</div>
	)
}
