import { Monitor } from "lucide-react"
import type { ChangeEvent } from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { WidgetColors, WidgetColorsConfig } from "./types"

interface AppearanceCardProps {
	colors: WidgetColorsConfig
	position: "left" | "right"
	onLightColorChange: (key: keyof WidgetColors, value: string) => void
	onDarkColorChange: (key: keyof WidgetColors, value: string) => void
	onPositionChange: (position: "left" | "right") => void
}

interface ColorRowProps {
	label: string
	lightValue: string
	darkValue: string
	onLightChange: (value: string) => void
	onDarkChange: (value: string) => void
}

/**
 * Parse HSL color string to hex.
 * Accepts multiple formats:
 * - hsl(120 50% 50%) - space-separated (modern)
 * - hsl(120, 50%, 50%) - comma-separated
 * - hsla(120, 50%, 50%, 0.5) - with alpha (alpha is ignored)
 * - hsl(120 50% 50% / 0.5) - space-separated with alpha
 */
function tryHslToHex(hsl: string): string | null {
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

function ColorRow({
	label,
	lightValue,
	darkValue,
	onLightChange,
	onDarkChange,
}: ColorRowProps) {
	// Track invalid text input separately to show parsing errors
	const [lightInvalid, setLightInvalid] = useState<string | null>(null)
	const [darkInvalid, setDarkInvalid] = useState<string | null>(null)

	// Compute display values - use invalid text if present, otherwise use prop value
	const lightDisplayValue = lightInvalid ?? lightValue
	const darkDisplayValue = darkInvalid ?? darkValue

	const handleLightChange = (e: ChangeEvent<HTMLInputElement>) => {
		onLightChange(e.target.value)
	}

	const handleDarkChange = (e: ChangeEvent<HTMLInputElement>) => {
		onDarkChange(e.target.value)
	}

	// Factory function to create color text change handlers
	const createColorChangeHandler = (
		setInvalid: (value: string | null) => void,
		onChange: (value: string) => void,
	) => {
		return (e: ChangeEvent<HTMLInputElement>) => {
			const newValue = e.target.value
			const trimmed = newValue.trim().toLowerCase()

			// Update invalid state to show the user's raw input
			setInvalid(newValue)

			if (trimmed.startsWith("#")) {
				const hex = trimmed.slice(1)
				if (/^[0-9a-f]{3}$/i.test(hex)) {
					const normalized = `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
					setInvalid(null)
					onChange(normalized)
					return
				}
				if (/^[0-9a-f]{6}$/i.test(hex)) {
					setInvalid(null)
					onChange(trimmed)
				}
				return
			}

			if (trimmed.startsWith("hsl(")) {
				const converted = tryHslToHex(trimmed)
				if (converted) {
					setInvalid(null)
					onChange(converted)
				}
				// Keep invalid state if parsing fails so user sees their input
			}
		}
	}

	const handleLightTextChange = createColorChangeHandler(
		setLightInvalid,
		onLightChange,
	)
	const handleDarkTextChange = createColorChangeHandler(
		setDarkInvalid,
		onDarkChange,
	)

	const lightPickerValue = tryHslToHex(lightValue) || lightValue
	const darkPickerValue = tryHslToHex(darkValue) || darkValue

	return (
		<div className="grid grid-cols-[140px_1fr_1fr] items-start gap-4">
			<Label className="break-words pt-2 font-medium text-sm leading-tight">
				{label}
			</Label>

			{/* Light Mode */}
			<div className="space-y-2">
				<Input
					type="color"
					value={lightPickerValue}
					onChange={handleLightChange}
					className="h-10 w-full p-1"
					aria-label={`${label} light mode color`}
				/>
				<Input
					type="text"
					value={lightDisplayValue}
					onChange={handleLightTextChange}
					className="h-8 font-mono text-xs"
					placeholder="#ffffff"
				/>
			</div>

			{/* Dark Mode */}
			<div className="space-y-2">
				<Input
					type="color"
					value={darkPickerValue}
					onChange={handleDarkChange}
					className="h-10 w-full p-1"
					aria-label={`${label} dark mode color`}
				/>
				<Input
					type="text"
					value={darkDisplayValue}
					onChange={handleDarkTextChange}
					className="h-8 font-mono text-xs"
					placeholder="#000000"
				/>
			</div>
		</div>
	)
}

const COLOR_LABELS: { key: keyof WidgetColors; label: string }[] = [
	{ key: "primary", label: "Primary Color" },
	{ key: "bgPrimary", label: "Background" },
	{ key: "bgSecondary", label: "Secondary Background" },
	{ key: "textPrimary", label: "Text Color" },
	{ key: "textSecondary", label: "Secondary Text" },
	{ key: "border", label: "Border Color" },
]

export function AppearanceCard({
	colors,
	position,
	onLightColorChange,
	onDarkColorChange,
	onPositionChange,
}: AppearanceCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Monitor size={20} />
					Appearance
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				<fieldset className="space-y-2">
					<legend className="font-medium text-sm">Widget Position</legend>
					<div className="flex gap-2">
						<Button
							type="button"
							aria-pressed={position === "left"}
							variant={position === "left" ? "default" : "outline"}
							onClick={() => onPositionChange("left")}
						>
							Bottom Left
						</Button>
						<Button
							type="button"
							aria-pressed={position === "right"}
							variant={position === "right" ? "default" : "outline"}
							onClick={() => onPositionChange("right")}
						>
							Bottom Right
						</Button>
					</div>
				</fieldset>

				<div className="space-y-4">
					<div className="grid grid-cols-[120px_1fr_1fr] gap-4 border-b pb-2">
						<span className="font-medium text-sm">Color</span>
						<div className="flex items-center gap-2 font-medium text-sm">
							<div className="h-4 w-4 rounded-full border border-gray-200 bg-white" />
							Light Mode
						</div>
						<div className="flex items-center gap-2 font-medium text-sm">
							<div className="h-4 w-4 rounded-full border border-gray-600 bg-gray-900" />
							Dark Mode
						</div>
					</div>

					<div className="space-y-4">
						{COLOR_LABELS.map((item) => (
							<ColorRow
								key={item.key}
								label={item.label}
								lightValue={colors.light[item.key]}
								darkValue={colors.dark[item.key]}
								onLightChange={(v) => onLightColorChange(item.key, v)}
								onDarkChange={(v) => onDarkColorChange(item.key, v)}
							/>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
