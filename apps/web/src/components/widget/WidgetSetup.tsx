import { useState } from "react"
import { useCurrentUser } from "@/api/hooks"
import type { WidgetColors, WidgetColorsConfig } from "./setup"
import {
	AppearanceCard,
	defaultColors,
	EmbedCodeCard,
	WidgetPreview,
} from "./setup"

export function WidgetSetup() {
	const { data: client, isLoading } = useCurrentUser()
	const [colors, setColors] = useState<WidgetColorsConfig>(defaultColors)
	const [position, setPosition] = useState<"left" | "right">("right")

	const updateLightColor = (key: keyof WidgetColors, value: string) => {
		setColors((prev) => ({ ...prev, light: { ...prev.light, [key]: value } }))
	}

	const updateDarkColor = (key: keyof WidgetColors, value: string) => {
		setColors((prev) => ({ ...prev, dark: { ...prev.dark, [key]: value } }))
	}

	return (
		<div className="grid gap-6 lg:grid-cols-2">
			{/* Configuration Panel */}
			<div className="space-y-6">
				<AppearanceCard
					colors={colors}
					position={position}
					onLightColorChange={updateLightColor}
					onDarkColorChange={updateDarkColor}
					onPositionChange={setPosition}
				/>

				<EmbedCodeCard
					clientId={client?.data?.id}
					position={position}
					colors={colors}
					isLoading={isLoading}
				/>
			</div>

			{/* Preview Panel */}
			<WidgetPreview colors={colors} position={position} />
		</div>
	)
}
