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
				<div className="space-y-2">
					<Label>Widget Position</Label>
					<div className="flex gap-2">
						<Button
							type="button"
							variant={position === "left" ? "default" : "outline"}
							onClick={() => onPositionChange("left")}
						>
							Bottom Left
						</Button>
						<Button
							type="button"
							variant={position === "right" ? "default" : "outline"}
							onClick={() => onPositionChange("right")}
						>
							Bottom Right
						</Button>
					</div>
				</div>

				<div className="space-y-3">
					<Label>Brand Colors</Label>
					<div className="grid gap-3">
						<ColorPicker
							label="Primary (buttons, header)"
							value={colors.primary}
							onChange={(v) => onColorChange("primary", v)}
						/>
						<ColorPicker
							label="Background Primary"
							value={colors.bgPrimary}
							onChange={(v) => onColorChange("bgPrimary", v)}
						/>
						<ColorPicker
							label="Background Secondary"
							value={colors.bgSecondary}
							onChange={(v) => onColorChange("bgSecondary", v)}
						/>
						<ColorPicker
							label="Text Primary"
							value={colors.textPrimary}
							onChange={(v) => onColorChange("textPrimary", v)}
						/>
						<ColorPicker
							label="Text Secondary"
							value={colors.textSecondary}
							onChange={(v) => onColorChange("textSecondary", v)}
						/>
						<ColorPicker
							label="Border Color"
							value={colors.border}
							onChange={(v) => onColorChange("border", v)}
						/>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
