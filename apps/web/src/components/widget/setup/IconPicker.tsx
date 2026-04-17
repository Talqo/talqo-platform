import { useState } from "react"
import {
	Bot,
	MessageCircle,
	Cat,
	Dog,
	Bird,
	Sparkles,
	Ghost,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface IconPickerProps {
	label: string
	value: string
	onChange: (value: string) => void
}

const PRESET_ICONS = [
	{ name: "bot", icon: Bot, label: "Bot" },
	{ name: "message-circle", icon: MessageCircle, label: "Chat" },
	{ name: "cat", icon: Cat, label: "Cat" },
	{ name: "dog", icon: Dog, label: "Dog" },
	{ name: "bird", icon: Bird, label: "Bird" },
	{ name: "sparkles", icon: Sparkles, label: "Sparkles" },
	{ name: "ghost", icon: Ghost, label: "Ghost" },
]

export function IconPicker({ label, value, onChange }: IconPickerProps) {
	const [mode, setMode] = useState<"preset" | "custom">(
		PRESET_ICONS.some((p) => p.name === value) ? "preset" : "custom",
	)
	const [customSvg, setCustomSvg] = useState(
		PRESET_ICONS.some((p) => p.name === value) ? "" : value,
	)

	const handlePresetSelect = (name: string) => {
		onChange(name)
	}

	const handleCustomChange = (svg: string) => {
		setCustomSvg(svg)
		onChange(svg)
	}

	return (
		<div className="space-y-3">
			<Label className="text-sm font-medium">{label}</Label>

			<div className="flex gap-2">
				<Button
					type="button"
					variant={mode === "preset" ? "default" : "outline"}
					size="sm"
					onClick={() => setMode("preset")}
				>
					Preset Icons
				</Button>
				<Button
					type="button"
					variant={mode === "custom" ? "default" : "outline"}
					size="sm"
					onClick={() => setMode("custom")}
				>
					Custom SVG
				</Button>
			</div>

			{mode === "preset" ? (
				<div className="flex flex-wrap gap-2">
					{PRESET_ICONS.map((preset) => {
						const IconComponent = preset.icon
						const isSelected = value === preset.name
						return (
							<Button
								key={preset.name}
								type="button"
								variant={isSelected ? "default" : "outline"}
								size="sm"
								className="flex items-center gap-2"
								onClick={() => handlePresetSelect(preset.name)}
							>
								<IconComponent size={16} />
								<span className="text-xs">{preset.label}</span>
							</Button>
						)
					})}
				</div>
			) : (
				<div className="space-y-2">
					<Textarea
						value={customSvg}
						onChange={(e) => handleCustomChange(e.target.value)}
						placeholder="Paste SVG markup here..."
						className="font-mono text-xs min-h-[100px]"
					/>
					<p className="text-xs text-muted-foreground">
						Paste an SVG element. It should be a single icon without
						width/height attributes.
					</p>
				</div>
			)}
		</div>
	)
}
