import { Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ColorPicker } from "./ColorPicker"
import type { WidgetColors } from "./types"

interface AppearanceCardProps {
	colors: WidgetColors
	position: "left" | "right"
	onColorChange: (key: keyof WidgetColors, value: string) => void
	onPositionChange: (position: "left" | "right") => void
}

const COLOR_PICKERS: { key: keyof WidgetColors; label: string }[] = [
	{ key: "primary", label: "Primary (buttons, header)" },
	{ key: "bgPrimary", label: "Background Primary" },
	{ key: "bgSecondary", label: "Background Secondary" },
	{ key: "textPrimary", label: "Text Primary" },
	{ key: "textSecondary", label: "Text Secondary" },
	{ key: "border", label: "Border Color" },
]

export function AppearanceCard({
	colors,
	position,
	onColorChange,
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
			<CardContent className="space-y-4">
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

				<div className="space-y-3">
					<Label>Brand Colors</Label>
					<div className="grid gap-3">
						{COLOR_PICKERS.map((item) => (
							<ColorPicker
								key={item.key}
								label={item.label}
								value={colors[item.key]}
								onChange={(v) => onColorChange(item.key, v)}
							/>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
