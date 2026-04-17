import { Monitor } from "lucide-react"
import type { ChangeEvent } from "react"
import { useEffect, useState } from "react"
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

function tryHslToHex(hsl: string): string | null {
	if (hsl.startsWith("#")) return null
	const match = hsl.match(
		/^hsl\(\s*(\d{1,3}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?)%\s+(\d{1,3}(?:\.\d+)?)%\s*\)$/,
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
	const [lightDraft, setLightDraft] = useState(lightValue)
	const [darkDraft, setDarkDraft] = useState(darkValue)

	useEffect(() => {
		setLightDraft(lightValue)
	}, [lightValue])

	useEffect(() => {
		setDarkDraft(darkValue)
	}, [darkValue])

	const handleLightChange = (e: ChangeEvent<HTMLInputElement>) => {
		onLightChange(e.target.value)
	}

	const handleDarkChange = (e: ChangeEvent<HTMLInputElement>) => {
		onDarkChange(e.target.value)
	}

	const handleLightTextChange = (e: ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value
		setLightDraft(newValue)
		const trimmed = newValue.trim().toLowerCase()
		if (trimmed.startsWith("#")) {
			const hex = trimmed.slice(1)
			if (/^[0-9a-f]{3}$/i.test(hex)) {
				const normalized = `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
				setLightDraft(normalized)
				onLightChange(normalized)
				return
			}
			if (/^[0-9a-f]{6}$/i.test(hex)) {
				onLightChange(trimmed)
			}
			return
		}
		if (trimmed.startsWith("hsl(")) {
			const converted = tryHslToHex(trimmed)
			if (converted) {
				onLightChange(trimmed)
			}
		}
	}

	const handleDarkTextChange = (e: ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value
		setDarkDraft(newValue)
		const trimmed = newValue.trim().toLowerCase()
		if (trimmed.startsWith("#")) {
			const hex = trimmed.slice(1)
			if (/^[0-9a-f]{3}$/i.test(hex)) {
				const normalized = `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
				setDarkDraft(normalized)
				onDarkChange(normalized)
				return
			}
			if (/^[0-9a-f]{6}$/i.test(hex)) {
				onDarkChange(trimmed)
			}
			return
		}
		if (trimmed.startsWith("hsl(")) {
			const converted = tryHslToHex(trimmed)
			if (converted) {
				onDarkChange(trimmed)
			}
		}
	}

	const lightPickerValue = tryHslToHex(lightValue) || lightValue
	const darkPickerValue = tryHslToHex(darkValue) || darkValue

	return (
		<div className="grid grid-cols-[140px_1fr_1fr] items-start gap-4">
			<Label className="break-words pt-2 text-sm font-medium leading-tight">
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
					value={lightDraft}
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
					value={darkDraft}
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
					<div
						className="flex gap-2"
						role="radiogroup"
						aria-label="Widget Position"
					>
						<Button
							type="button"
							role="radio"
							aria-checked={position === "left"}
							variant={position === "left" ? "default" : "outline"}
							onClick={() => onPositionChange("left")}
						>
							Bottom Left
						</Button>
						<Button
							type="button"
							role="radio"
							aria-checked={position === "right"}
							variant={position === "right" ? "default" : "outline"}
							onClick={() => onPositionChange("right")}
						>
							Bottom Right
						</Button>
					</div>
				</fieldset>

				<div className="space-y-4">
					<div className="grid grid-cols-[120px_1fr_1fr] gap-4 border-b pb-2">
						<span className="text-sm font-medium">Color</span>
						<div className="flex items-center gap-2 text-sm font-medium">
							<div className="h-4 w-4 rounded-full border border-gray-200 bg-white" />
							Light Mode
						</div>
						<div className="flex items-center gap-2 text-sm font-medium">
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
