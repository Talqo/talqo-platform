import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ColorPickerProps {
	label: string
	value: string
	onChange: (value: string) => void
}

function hslToHex(hsl: string): string {
	if (hsl.startsWith("#")) return hsl

	const match = hsl.match(/hsl\((\d+)\s+(\d+)%?\s+(\d+)%?\)/)
	if (!match) return "#10b981"

	const h = Number.parseInt(match[1], 10) / 360
	const s = Number.parseInt(match[2], 10) / 100
	const l = Number.parseInt(match[3], 10) / 100

	const hue2rgb = (p: number, q: number, t: number) => {
		if (t < 0) t += 1
		if (t > 1) t -= 1
		if (t < 1 / 6) return p + (q - p) * 6 * t
		if (t < 1 / 2) return q
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
		return p
	}

	const q = l < 0.5 ? l * (1 + s) : l + s - l * s
	const p = 2 * l - q

	const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255)
	const g = Math.round(hue2rgb(p, q, h) * 255)
	const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255)

	return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
	return (
		<div className="flex items-center gap-3">
			<Label className="w-32 flex-shrink-0 text-sm">{label}</Label>
			<div className="flex flex-1 items-center gap-2">
				<Input
					type="color"
					value={value.startsWith("hsl") ? hslToHex(value) : value}
					onChange={(e) => onChange(e.target.value)}
					className="h-9 w-16 p-1"
				/>
				<Input
					type="text"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className="flex-1 font-mono text-sm"
					placeholder="#ffffff or hsl(...)"
				/>
			</div>
		</div>
	)
}
